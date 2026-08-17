import {
	doc,
	onSnapshot,
	getDoc,
	getDocs,
	collection,
	serverTimestamp,
	query,
	limit,
	writeBatch,
	updateDoc,
	deleteField,
	type Unsubscribe,
} from "firebase/firestore";
import { getDb, getAuthInstance } from "./config";
import {
	WORDS_SCHEMA_VERSION,
	allShardIds,
	changedShardIds,
	mergeShards,
	splitIntoShards,
	type WordMap,
} from "./wordShards";
/*
 * Ліниві акцесори до Firebase.
 *
 * SDK піднімається при ПЕРШОМУ зверненні, а не на імпорті цього модуля: інакше
 * будь-який тест, що транзитивно тягне файл, вимагав би бойових ключів, щоб
 * узагалі зібратися (CLOUD-DATABASE-v8 § 10.1).
 */
const db = () => getDb();
const auth = () => getAuthInstance();

import { settingsStore } from "../../controllers/SettingsStore.svelte";
import { progressStore } from "../../controllers/ProgressStore.svelte";
import { playlistStore } from "../../controllers/PlaylistStore.svelte";
import { friendsStore } from "../../controllers/FriendsStore.svelte";
import { logService } from "../logService.svelte";
import { localStorageProvider } from "../storage/storageProvider";
import { statisticsState } from "../../controllers/StatisticsState.svelte";
import { dev } from "$app/environment";
import {
	AppSettingsSchema,
	ProgressStateSchema,
	PlaylistStateSchema,
	type AppSettings,
	type ProgressState,
	type PlaylistState,
	type LevelStats,
	type Playlist,
	type WordProgress,
} from "../../data/schemas";

/** Стани синхронізації */
export type SyncStatus = "idle" | "syncing" | "error" | "up-to-date" | "offline";

const COLLECTIONS = {
	USERS: "users",
	PROFILES: "profiles",
	HISTORY: "history",
};

const RETRY_CONFIG = {
	maxAttempts: 3,
	baseDelay: 1000,
	maxDelay: 10000,
};

interface UserCloudData {
	settings?: AppSettings;
	progress?: ProgressState;
	playlists?: {
		dbVersion?: number;
		systemPlaylists?: Record<string, Playlist>;
		mistakeMetadata?: Record<string, number>;
		updatedAt?: number;
		customPlaylists?: Playlist[]; // For v1 support
	};
	lastSync?: number;
	migrationV2At?: number;
}

/**
 * Сервіс для синхронізації локальних даних з Firestore.
 * Оброблений згідно з принципами SSoT та чистої архітектури.
 */
class SyncServiceClass {
	private unsubscribe: Unsubscribe | null = null;
	private unsubscribePlaylists: Unsubscribe | null = null;
	private uploadTimeout: ReturnType<typeof setTimeout> | null = null;
	private retryCount = 0;

	private latestCloudMainDoc: UserCloudData | null = null;
	private latestCloudCustomPlaylists: Playlist[] | null = null;
	/**
	 * Прогрес по словах, як він лежить у хмарі зараз.
	 *
	 * Потрібен, щоб знати, ЯКІ шарди змінилися: без цього довелося б писати всі
	 * шістнадцять на кожну синхронізацію — тобто повернутися до перезапису всього
	 * прогресу заради одного лічильника.
	 */
	private latestCloudWords: WordMap | null = null;

	// Реактивні стани (Runes)
	status = $state<SyncStatus>("idle");
	isOnline = $state(typeof navigator !== "undefined" ? navigator.onLine : true);
	lastSyncAttempt = $state(0);
	hasInitialData = $state(false);
	migrationInProgress = $state(false);
	migrationTotal = $state(0);
	migrationCurrent = $state(0);

	private isDownloading = false;
	private isUploading = false;
	private pendingUpload = false;
	private pendingCloudUpdate: UserCloudData | null = null;
	private consecutiveFailures = 0;
	private currentUid: string | null = null;
	private boundHandleVisibilityChange: (() => void) | null = null;

	constructor() {
		if (typeof window !== "undefined") {
			window.addEventListener("online", () => this.handleNetworkChange(true));
			window.addEventListener("offline", () => this.handleNetworkChange(false));

			// Надійний спосіб збереження при закритті/згортанні
			this.boundHandleVisibilityChange = () => {
				if (document.visibilityState === "hidden" && (this.uploadTimeout || this.status === "syncing" || this.pendingUpload)) {
					logService.log("sync", "App hidden, forcing immediate sync...");
					this.performUpload();
				}
			};
			document.addEventListener("visibilitychange", this.boundHandleVisibilityChange);
		}
	}

	private triggerCombinedCloudUpdate() {
		if (!this.latestCloudMainDoc) return;

		const dbVersion = this.latestCloudMainDoc.playlists?.dbVersion || 1;
		const isV2 = dbVersion >= 2;

		// КРИТИЧНО: Якщо це v2, але підколекція ще в процесі завантаження - чекаємо,
		// щоб уникнути Race Condition та "блимання" UI
		if (isV2 && this.latestCloudCustomPlaylists === null) {
			return;
		}

		const combinedData = {
			...this.latestCloudMainDoc,
			playlists: {
				...(this.latestCloudMainDoc.playlists || {}),
			}
		};

		// Якщо користувач вже на v2, беремо завантажену підколекцію
		if (isV2) {
			combinedData.playlists.customPlaylists = this.latestCloudCustomPlaylists || [];
		}

		this.handleCloudUpdate(combinedData);

		if (!this.hasInitialData && this.latestCloudMainDoc && (this.latestCloudCustomPlaylists !== null || !isV2)) {
			this.hasInitialData = true;
			if (this.status === "syncing") this.status = "up-to-date";
		}
	}

	/**
	 * migrateToV2 виконує перенесення плейлистів з масиву в головному документі
	 * в окремі документи підколекції playlists_v2.
	 */
	private async migrateToV2(uid: string, customPlaylists: Playlist[]) {
		logService.log("sync", "Starting database migration to v2 (playlists subcollection)...");
		const playlistsRef = collection(db(), COLLECTIONS.USERS, uid, "playlists_v2");

		this.migrationInProgress = true;
		this.migrationTotal = customPlaylists.length;
		this.migrationCurrent = 0;

		try {
			if (customPlaylists.length === 0) {
				const userDocRef = doc(db(), COLLECTIONS.USERS, uid);
				const batch = writeBatch(db());
				batch.set(userDocRef, {
					playlists: { dbVersion: 2 },
					migrationV2At: Date.now()
				}, { merge: true });
				await batch.commit();
				logService.log("sync", "Migration to v2 completed successfully (0 playlists).");
				return;
			}

			// Firebase Batch обмежений 500 операціями
			const CHUNK_SIZE = 400;
			for (let i = 0; i < customPlaylists.length; i += CHUNK_SIZE) {
				const chunk = customPlaylists.slice(i, i + CHUNK_SIZE);
				const batch = writeBatch(db());

				for (const playlist of chunk) {
					if (playlist && playlist.id) {
						const pRef = doc(playlistsRef, playlist.id);
						batch.set(pRef, playlist);
					}
				}

				// Оновлюємо версію БД лише в останньому чанку
				if (i + CHUNK_SIZE >= customPlaylists.length) {
					const userDocRef = doc(db(), COLLECTIONS.USERS, uid);
					batch.set(userDocRef, {
						playlists: { dbVersion: 2 },
						migrationV2At: Date.now()
					}, { merge: true });
				}

				await batch.commit();
				this.migrationCurrent = Math.min(i + CHUNK_SIZE, customPlaylists.length);
				logService.log("sync", `Migration progress: ${this.migrationCurrent} / ${this.migrationTotal}`);
			}

			logService.log("sync", "Migration to v2 completed successfully.");

			// Через фасад, а не голим ключем: `"slovko_playlists"` дублював префікс
			// рядком, тож перейменування STORAGE_PREFIX лишило б цей рядок позаду —
			// і міграція тихо перестала б прибирати за собою.
			localStorageProvider.removeItem("playlists");
		} catch (err) {
			logService.error("sync", "Migration to v2 failed:", err);
			this.status = "error";
			this.hasInitialData = true; 
		} finally {
			this.migrationInProgress = false;
		}
	}

	/**
	 * Ініціалізація синхронізації для користувача
	 */
	init(uid: string) {
		if (this.currentUid === uid && this.unsubscribe) {
			logService.log("sync", "Sync already initialized for this user, skipping.");
			return;
		}

		this.stop();
		this.currentUid = uid;
		this.hasInitialData = false;
		this.status = "syncing";
		this.latestCloudMainDoc = null;
		this.latestCloudCustomPlaylists = null;

		const userDocRef = doc(db(), COLLECTIONS.USERS, uid);
		const playlistsV2Ref = collection(db(), COLLECTIONS.USERS, uid, "playlists_v2");

		this.unsubscribe = onSnapshot(
			userDocRef,
			async (snapshot) => {
				const cloudData = snapshot.exists() ? snapshot.data() as UserCloudData : {};
				const dbVersion = cloudData.playlists?.dbVersion || 1;

				if (dbVersion < 2) {
					logService.log("sync", "Old dbVersion detected. Starting migration to v2.");
					this.migrateToV2(uid, cloudData.playlists?.customPlaylists || []);
					return;
				}

				// --- Логіка очищення старого масиву через 3 дні ---
				if (dbVersion >= 2 && cloudData.playlists?.customPlaylists !== undefined) {
					const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

					if (!cloudData.migrationV2At) {
						logService.log("sync", "V2 user missing migration date. Setting it now.");
						try {
							await updateDoc(userDocRef, { migrationV2At: Date.now() });
						} catch (e) {
							logService.error("sync", "Failed to set fallback migration date", e);
						}
					} else if (Date.now() - cloudData.migrationV2At > THREE_DAYS_MS) {
						logService.log("sync", "3 days passed since V2 migration. Cleaning up...");
						try {
							await updateDoc(userDocRef, {
								"playlists.customPlaylists": deleteField(),
								migrationV2At: deleteField()
							});
							logService.log("sync", "Cleanup successful!");
						} catch (e) {
							logService.error("sync", "Failed to cleanup old playlists", e);
						}
					}
				}

				this.latestCloudMainDoc = cloudData;
				this.triggerCombinedCloudUpdate();

				if (!snapshot.exists() || (cloudData.progress?.totalCorrect || 0) === 0) {
					this.checkForOrphanedHistory(uid);
				} else if (cloudData.progress && !cloudData.progress.isActiveDaysRecovered && (cloudData.progress.activeDaysCount || 0) === 0 && (cloudData.progress.totalCorrect || 0) > 0) {
					this.checkForMissingActiveDays();
				}
			},
			(error) => {
				logService.error("sync", "Main doc listener error:", error);
				this.status = "error";
				if (this.isOnline) this.scheduleRetry();
			},
		);

		this.unsubscribePlaylists = onSnapshot(
			playlistsV2Ref,
			(snapshot) => {
				const customPlaylists = snapshot.docs.map(doc => doc.data() as Playlist);
				this.latestCloudCustomPlaylists = customPlaylists;
				this.triggerCombinedCloudUpdate();
			},
			(error) => {
				logService.error("sync", "Playlists v2 listener error:", error);
			}
		);

		logService.log("sync", `Sync initialized for user: ${uid}`);

		if (dev && typeof window !== "undefined") {
			(window as unknown as { wordApp: unknown }).wordApp = {
				sync: this,
				stats: statisticsState,
				restorePoints: (amount: number, reason: string) => this.restorePoints(amount, reason),
				recover: () => statisticsState.recoverProgressFromHistory(),
				getHistory: (start: string, end: string) => statisticsState.getHistoryByRange(start, end)
			};
		}
	}

	/**
	 * Зупинка синхронізації
	 */
	stop() {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
		if (this.unsubscribePlaylists) {
			this.unsubscribePlaylists();
			this.unsubscribePlaylists = null;
		}
		if (this.uploadTimeout) {
			clearTimeout(this.uploadTimeout);
			this.uploadTimeout = null;
		}
		if (typeof document !== "undefined" && this.boundHandleVisibilityChange) {
			document.removeEventListener("visibilitychange", this.boundHandleVisibilityChange);
			this.boundHandleVisibilityChange = null;
		}
		this.isUploading = false;
		this.isDownloading = false;
		this.currentUid = null;
		this.retryCount = 0;
		this.status = "idle";
	}

	private handleNetworkChange(online: boolean) {
		this.isOnline = online;
		logService.log("sync", `Network: ${online ? "online" : "offline"}`);
		if (online) {
			this.retryCount = 0;
			this.uploadAll();
		} else {
			this.status = "offline";
		}
	}

	private async checkForMissingActiveDays() {
		try {
			logService.warn("sync", "Triggering active days recovery...");
			const count = await statisticsState.recoverActiveDaysCount();
			if (count > 0) {
				this.uploadAll();
			} else {
				const currentProgress = progressStore.value;
				progressStore._internalSet({
					...currentProgress,
					activeDaysCount: Math.max(1, currentProgress.activeDaysCount || 0),
					isActiveDaysRecovered: true
				});
				this.uploadAll();
			}
		} catch (e) {
			logService.error("sync", "Error checking missing active days:", e);
		}
	}

	private async checkForOrphanedHistory(uid: string) {
		try {
			const historyRef = collection(db(), COLLECTIONS.USERS, uid, COLLECTIONS.HISTORY);
			const q = query(historyRef, limit(1));
			const snapshot = await getDocs(q);

			if (!snapshot.empty) {
				logService.warn("sync", "Found orphaned history. Recovering...");
				await statisticsState.recoverProgressFromHistory();
				this.uploadAll();
			}
		} catch (e) {
			logService.error("sync", "Error checking orphaned history:", e);
		}
	}

	resetLocalData() {
		progressStore.reset();
		playlistStore.reset();
	}

	async uploadAll(force = false) {
		if (!auth().currentUser || !this.isOnline) return;

		this.pendingUpload = true;
		if (this.uploadTimeout) clearTimeout(this.uploadTimeout);

		if (force) {
			return await this.performUpload();
		} else {
			this.uploadTimeout = setTimeout(() => {
				this.performUpload();
			}, 3000);
		}
	}

	private async performUpload() {
		// Захоплюємо один раз: між перевіркою й записом лежить `await`, і за цей
		// час `currentUser` може стати іншим — тоді дані поїхали б у чужий документ.
		const user = auth().currentUser;
		if (!user || this.isDownloading || !this.hasInitialData || !this.isOnline || this.isUploading) {
			return;
		}

		this.isUploading = true;
		this.pendingUpload = false;
		this.status = "syncing";

		const uid = user.uid;
		const userDocRef = doc(db(), COLLECTIONS.USERS, uid);
		const profileRef = doc(db(), COLLECTIONS.PROFILES, uid);
		const playlistsV2Ref = collection(db(), COLLECTIONS.USERS, uid, "playlists_v2");

		try {
			const today = new Date().toISOString().split("T")[0];
			const historyRef = doc(db(), COLLECTIONS.USERS, uid, COLLECTIONS.HISTORY, today);

			/*
			 * Прогрес по словах приходить із підколекції `words`, а не з поля
			 * головного документа. Шістнадцять читань замість одного — ціна за те,
			 * що жоден із них не впирається в межу 1 МіБ і що запис торкається
			 * одного шарда замість усього прогресу.
			 */
			const wordsCollection = collection(db(), COLLECTIONS.USERS, uid, "words");
			const [snapshot, historySnap, shardSnaps] = await Promise.all([
				getDoc(userDocRef),
				getDoc(historyRef),
				Promise.all(allShardIds().map((id) => getDoc(doc(wordsCollection, id))))
			]);

			const cloudData = snapshot.exists() ? snapshot.data() as UserCloudData : {};
			const cloudHistory = historySnap.exists() ? historySnap.data() as ProgressState : null;

			/*
			 * Поки користувач не мігрував, слова лежать у старому полі — беремо
			 * звідти. Після міграції поле зникає, і джерелом стають шарди. Обидва
			 * шляхи існують одночасно рівно один прогін, і саме тому запис нижче
			 * робить перенесення й видалення ОДНИМ атомарним батчем.
			 */
			const shardedWords = mergeShards(shardSnaps.map((snap) => (snap.exists() ? (snap.data() as WordMap) : null)));
			const legacyWords = (cloudData.progress as { words?: WordMap } | undefined)?.words ?? {};
			this.latestCloudWords = Object.keys(shardedWords).length > 0 ? shardedWords : legacyWords;
			if (cloudData.progress) {
				(cloudData.progress as { words?: WordMap }).words = this.latestCloudWords;
			}

			const dbVersion = cloudData.playlists?.dbVersion || 1;
			const isV2 = dbVersion >= 2;

			if (isV2 && this.latestCloudCustomPlaylists === null) {
				logService.warn("sync", "Aborting upload: playlists_v2 not loaded.");
				this.isUploading = false;
				this.status = "error";
				return;
			}

			const localProgress = progressStore.value;
			const localSettings = settingsStore.value;
			const localActivity = progressStore.todayActivity;
			const localPlaylists = playlistStore.getSnapshotState();

			const mergedProgress = this.mergeProgress(localProgress, (cloudData.progress || {}) as ProgressState);
			const mergedSettings = this.mergeSettings(localSettings, cloudData.settings || null);
			const mergedPlaylists = this.mergePlaylists(localPlaylists, (cloudData.playlists || {}) as PlaylistState);

			if ((cloudData.progress?.totalCorrect || 0) > localProgress.totalCorrect) {
				progressStore._internalSet(mergedProgress);
				if (cloudHistory) {
					progressStore._internalSetActivity(cloudHistory);
				}
			}

			const mainDocPlaylists = {
				dbVersion: 2,
				systemPlaylists: mergedPlaylists.systemPlaylists,
				mistakeMetadata: mergedPlaylists.mistakeMetadata,
				updatedAt: mergedPlaylists.updatedAt
			};

			/*
			 * МАПА СЛІВ НЕ ЙДЕ В ГОЛОВНИЙ ДОКУМЕНТ.
			 *
			 * Вона росте з кожним вивченим словом і впиралася б у межу 1 МіБ на
			 * документ, а кожна синхронізація перезаписувала б її цілком заради
			 * одного лічильника. Тепер слова живуть у підколекції `words` шардами,
			 * а сюди йде решта прогресу (підсумки, серії, дати) — вона обмежена за
			 * побудовою (CLOUD-DATABASE-v8 § 6.2).
			 */
			const { words: mergedWords, ...progressWithoutWords } = mergedProgress;
			const mergedData = {
				settings: mergedSettings,
				progress: { ...progressWithoutWords, dbVersion: WORDS_SCHEMA_VERSION },
				playlists: mainDocPlaylists,
				lastSync: Date.now(),
			};

			const profileUpdate = this.prepareProfileUpdate(mergedProgress);
			const batch = writeBatch(db());
			batch.set(userDocRef, mergedData, { merge: true });

			/*
			 * Пишемо лише ті шарди, які справді змінилися. Одне вивчене слово —
			 * один документ замість усього прогресу.
			 *
			 * Стару мапу з головного документа прибираємо ТИМ САМИМ батчем: батч
			 * атомарний, тож або шарди й видалення застосуються разом, або не
			 * застосується нічого. Проміжного стану, у якому прогрес уже стерто, а
			 * шардів ще немає, не існує.
			 */
			const wordsRef = collection(db(), COLLECTIONS.USERS, uid, "words");
			const shards = splitIntoShards(mergedWords ?? {});
			const dirty = changedShardIds(mergedWords ?? {}, this.latestCloudWords ?? {});
			for (const id of dirty) {
				batch.set(doc(wordsRef, id), shards[id]);
			}
			if ((cloudData.progress as { dbVersion?: number } | undefined)?.dbVersion !== WORDS_SCHEMA_VERSION) {
				batch.set(userDocRef, { progress: { words: deleteField() } }, { merge: true });
				logService.log("sync", `Міграція прогресу до v${WORDS_SCHEMA_VERSION}: ${dirty.length} шардів`);
			}
			this.latestCloudWords = mergedWords ?? {};
			batch.set(profileRef, profileUpdate, { merge: true });
			if (localActivity) {
				batch.set(historyRef, localActivity, { merge: true });
			}

			const mergedIds = new Set(mergedPlaylists.customPlaylists.map((p: Playlist) => p.id));
			for (const playlist of mergedPlaylists.customPlaylists) {
				const cloudPlaylist = this.latestCloudCustomPlaylists?.find(p => p.id === playlist.id);
				if (!cloudPlaylist || JSON.stringify(cloudPlaylist) !== JSON.stringify(playlist)) {
					const pRef = doc(playlistsV2Ref, playlist.id);
					batch.set(pRef, playlist, { merge: true });
				}
			}

			if (isV2 && this.latestCloudCustomPlaylists) {
				for (const cloudPlaylist of this.latestCloudCustomPlaylists) {
					if (!mergedIds.has(cloudPlaylist.id)) {
						batch.delete(doc(playlistsV2Ref, cloudPlaylist.id));
					}
				}
			}

			// Захоплюємо один раз: `currentUser` може змінитися між зверненнями.
			const user = auth().currentUser;
			if (!user) return;
			try {
				await batch.commit();
			} catch (err) {
				this.consecutiveFailures++;
				throw err;
			}

			this.retryCount = 0;
			this.consecutiveFailures = 0;
			this.lastSyncAttempt = Date.now();
			this.status = "up-to-date";
			logService.log("sync", "Upload successful");

			if (this.pendingCloudUpdate) {
				const data = this.pendingCloudUpdate;
				this.pendingCloudUpdate = null;
				this.handleCloudUpdate(data);
			}
		} catch (e: unknown) {
			const err = e as { code?: string };
			if (err?.code !== 'permission-denied' || auth().currentUser) {
				logService.error("sync", "Sync Upload Error:", e);
			}
			this.status = "error";
			this.isUploading = false;
			this.scheduleRetry();
		} finally {
			this.isUploading = false;
			if (this.pendingUpload) this.performUpload();
		}
	}

	private handleCloudUpdate(cloudData: UserCloudData) {
		// Захоплюємо один раз: `currentUser` може змінитися між зверненнями.
		const user = auth().currentUser;
		if (!user) return;
		if (this.isUploading) {
			this.pendingCloudUpdate = cloudData;
			return;
		}

		this.isDownloading = true;
		try {
			if (cloudData.settings) {
				const localSettings = settingsStore.value;
				const merged = this.mergeSettings(localSettings, cloudData.settings);
				if (JSON.stringify(merged) !== JSON.stringify(localSettings)) {
					settingsStore._internalUpdate(merged);
				}
			}

			if (cloudData.progress) {
				const result = ProgressStateSchema.safeParse(cloudData.progress);
				if (result.success) {
					const merged = this.mergeProgress(progressStore.value, result.data);
					progressStore._internalSet(merged);
				}
			}

			if (cloudData.playlists) {
				const localPlaylists = playlistStore.getSnapshotState();
				const merged = this.mergePlaylists(localPlaylists, cloudData.playlists as PlaylistState);
				if (merged.updatedAt > (localPlaylists.updatedAt || 0)) {
					playlistStore._internalSet(merged);
				}
			}
			friendsStore.checkFollowerNotifications();
		} catch (e) {
			logService.error("sync", "Sync Download Error:", e);
		} finally {
			this.isDownloading = false;
		}
	}

	private mergeSettings(local: AppSettings, cloud: AppSettings | null): AppSettings {
		if (!cloud) return local;
		try {
			const cloudSettings = AppSettingsSchema.parse(cloud);
			if ((cloudSettings.updatedAt || 0) > (local.updatedAt || 0)) {
				return this.deepMergeSettings(local, cloudSettings);
			} else {
				return this.deepMergeSettings(cloudSettings, local);
			}
		} catch (e) {
			logService.error("sync", "Failed to parse cloud settings", e);
			return local;
		}
	}

	private deepMergeSettings(base: AppSettings, updates: AppSettings): AppSettings {
		const result = { ...base, ...updates };
		if (base.voicePreferences && updates.voicePreferences) {
			result.voicePreferences = { ...base.voicePreferences, ...updates.voicePreferences };
		}
		result.lastSeenFollowerAt = Math.max(base.lastSeenFollowerAt || 0, updates.lastSeenFollowerAt || 0);
		return result;
	}

	private mergeProgress(local: ProgressState, cloud: ProgressState): ProgressState {
		const levelStats = this.mergeLevelStats(local.levelStats, cloud.levelStats || {});
		const sumLevelCorrect = Object.values(levelStats).reduce((sum, s) => sum + s.totalCorrect, 0);
		const baseTotalCorrect = Math.max(local.totalCorrect, cloud.totalCorrect || 0);
		const restored = Math.max(local.restoredPoints || 0, cloud.restoredPoints || 0);
		const validatedTotalCorrect = Math.max(baseTotalCorrect, sumLevelCorrect + restored);

		return {
			...local,
			...cloud,
			totalCorrect: validatedTotalCorrect,
			totalAttempts: Math.max(local.totalAttempts, cloud.totalAttempts || 0),
			restoredPoints: restored,
			streak: Math.max(local.streak || 0, cloud.streak || 0),
			dailyCorrect: Math.max(local.dailyCorrect || 0, cloud.dailyCorrect || 0),
			lastCorrectDate: (local.lastCorrectDate || "") >= (cloud.lastCorrectDate || "") ? local.lastCorrectDate : cloud.lastCorrectDate,
			lastStreakUpdateDate: (local.lastStreakUpdateDate || "") >= (cloud.lastStreakUpdateDate || "") ? local.lastStreakUpdateDate : cloud.lastStreakUpdateDate,
			restorationHistory: this.mergeArrays(local.restorationHistory || [], cloud.restorationHistory || [], (i) => (i.timestamp + i.reason).toString()),
			bestStreak: Math.max(local.bestStreak, cloud.bestStreak || 0),
			bestCorrectStreak: Math.max(local.bestCorrectStreak, cloud.bestCorrectStreak || 0),
			activeDaysCount: Math.max(local.activeDaysCount || 0, cloud.activeDaysCount || 0),
			lastUpdated: Math.max(local.lastUpdated, cloud.lastUpdated || 0),
			words: this.mergeWordProgress(local.words, cloud.words || {}),
			levelStats: levelStats,
		};
	}

	private mergeWordProgress(local: Record<string, WordProgress>, cloud: Record<string, WordProgress>): Record<string, WordProgress> {
		const merged = { ...cloud };
		for (const [key, lVal] of Object.entries(local)) {
			const cVal = cloud[key];
			if (!cVal || lVal.correctCount > cVal.correctCount) merged[key] = lVal;
		}
		return merged;
	}

	private mergeLevelStats(local: Record<string, LevelStats>, cloud: Record<string, LevelStats>) {
		const merged = { ...cloud };
		for (const key of Object.keys(merged)) {
			if (key.includes(",") || key === "ALL") delete merged[key];
		}
		for (const [lvl, l] of Object.entries(local)) {
			const c = merged[lvl];
			if (!c || l.totalCorrect >= c.totalCorrect) merged[lvl] = l;
		}
		return merged;
	}

	async restorePoints(amount: number, reason: string) {
		if (!auth().currentUser || amount <= 0) return;
		const current = progressStore.value;
		const record = { amount, reason, timestamp: Date.now(), adminId: "system" };
		progressStore._internalSet({
			...current,
			totalCorrect: current.totalCorrect + amount,
			restoredPoints: (current.restoredPoints || 0) + amount,
			restorationHistory: [...(current.restorationHistory || []), record].slice(-10)
		});
		this.uploadAll();
	}

	private mergePlaylists(local: PlaylistState, cloud: PlaylistState | null): PlaylistState {
		if (!cloud) return local;
		try {
			const validCloud = PlaylistStateSchema.parse(cloud);
			if ((validCloud.updatedAt || 0) > (local.updatedAt || 0)) return validCloud;
			if ((local.updatedAt || 0) > (validCloud.updatedAt || 0)) return local;
			return {
				...local,
				customPlaylists: this.mergeArrays(local.customPlaylists, validCloud.customPlaylists),
				systemPlaylists: {
					favorites: this.mergePlaylistObjects(local.systemPlaylists.favorites, validCloud.systemPlaylists.favorites),
					extra: this.mergePlaylistObjects(local.systemPlaylists.extra, validCloud.systemPlaylists.extra),
					mistakes: this.mergePlaylistObjects(local.systemPlaylists.mistakes, validCloud.systemPlaylists.mistakes),
				},
				mistakeMetadata: { ...validCloud.mistakeMetadata, ...local.mistakeMetadata }
			};
		} catch (e) {
			logService.error("sync", "Failed to parse playlists", e);
			return local;
		}
	}

	private mergePlaylistObjects(local: Playlist, cloud: Playlist): Playlist {
		return {
			...cloud,
			...local,
			words: this.mergeArrays(local.words || [], cloud.words || [], (w) => typeof w === "string" ? w : w.id)
		};
	}

	private mergeArrays<T>(local: T[], cloud: T[], getId: (item: T) => string = (i) => (i as unknown as { id: string }).id): T[] {
		// Саме нереактивна: `Map` живе рівно всередині цього виклику й гине разом
		// із ним, а назовні йде звичайний масив. `SvelteMap` тут — зайвий проксі
		// на кожне злиття плейлистів.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const map = new Map<string, T>();
		cloud.forEach((item) => map.set(getId(item), item));
		local.forEach((item) => map.set(getId(item), item));
		return Array.from(map.values());
	}

	private prepareProfileUpdate(progress: ProgressState) {
		const user = auth().currentUser;
		const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
		const update: Record<string, string | number | boolean | null | ReturnType<typeof serverTimestamp>> = {
			displayName,
			displayNameLower: displayName.toLowerCase(),
			photoURL: user?.photoURL || null,
			isAnonymous: user?.isAnonymous || false,
			totalCorrect: progress.totalCorrect,
			totalAttempts: progress.totalAttempts,
			bestStreak: progress.bestStreak,
			bestCorrectStreak: progress.bestCorrectStreak,
			accuracy: Math.round((progress.totalCorrect / (progress.totalAttempts || 1)) * 100),
			updatedAt: serverTimestamp(),
			activeDaysCount: progress.activeDaysCount || 0,
		};
		for (const [lvl, stats] of Object.entries(progress.levelStats)) {
			update[`level_${lvl}_totalCorrect`] = stats.totalCorrect;
			update[`level_${lvl}_bestCorrectStreak`] = stats.bestCorrectStreak;
			update[`level_${lvl}_accuracy`] = stats.totalAttempts > 0 ? Math.round((stats.totalCorrect / stats.totalAttempts) * 100) : 0;
		}
		return update;
	}

	private scheduleRetry() {
		if (this.retryCount >= RETRY_CONFIG.maxAttempts || this.consecutiveFailures >= 5) {
			this.status = "error";
			return;
		}
		const delay = Math.min(RETRY_CONFIG.baseDelay * Math.pow(2, this.retryCount), RETRY_CONFIG.maxDelay);
		this.retryCount++;
		setTimeout(() => { if (this.isOnline && auth().currentUser) this.performUpload(); }, delay);
	}

	getStatus() {
		return { status: this.status, isOnline: this.isOnline, lastSync: this.lastSyncAttempt };
	}
}

export const SyncService = new SyncServiceClass();