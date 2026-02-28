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
import { db, auth } from "./config";
import { settingsStore } from "../stores/settingsStore.svelte";
import { progressStore } from "../stores/progressStore.svelte";
import { playlistStore } from "../stores/playlistStore.svelte";
import { friendsStore } from "../stores/friendsStore.svelte";
import { logService } from "../services/logService";
import { statisticsService } from "../services/statisticsService.svelte";
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
	type CustomWord,
} from "../data/schemas";

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
	private v2PlaylistsLoading = false;

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
		} else {
			// Якщо v1, беремо те що є в головному документі
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
	 * 
	 * Важливо: Старий масив НЕ видаляється, а залишається як "заморожений бекап".
	 * Це дозволяє безпечно відкотитися, якщо в новій логіці виникнуть проблеми.
	 */
	private async migrateToV2(uid: string, customPlaylists: any[]) {
		logService.log("sync", "Starting database migration to v2 (playlists subcollection)...");
		const playlistsRef = collection(db, COLLECTIONS.USERS, uid, "playlists_v2");
		
		this.migrationInProgress = true;
		this.migrationTotal = customPlaylists.length;
		this.migrationCurrent = 0;

		try {
			if (customPlaylists.length === 0) {
				const userDocRef = doc(db, COLLECTIONS.USERS, uid);
				const batch = writeBatch(db);
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
				const batch = writeBatch(db);
				
				for (const playlist of chunk) {
					if (playlist && playlist.id) {
						const pRef = doc(playlistsRef, playlist.id);
						batch.set(pRef, playlist);
					}
				}
				
				// Оновлюємо версію БД лише в останньому чанку
				if (i + CHUNK_SIZE >= customPlaylists.length) {
					const userDocRef = doc(db, COLLECTIONS.USERS, uid);
					// Оновлюємо версію БД і ставимо дату міграції, але НЕ ВИДАЛЯЄМО старий масив (заморожений бекап)
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
			
			// Очищення старого localStorage (необов'язкове сміття)
			if (typeof window !== "undefined") {
				localStorage.removeItem("wordApp_playlists");
			}
		} catch (err) {
			logService.error("sync", "Migration to v2 failed:", err);
			this.status = "error";
			this.hasInitialData = true; // Пускаємо користувача офлайн, щоб не блокувати додаток
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

		const userDocRef = doc(db, COLLECTIONS.USERS, uid);
		const playlistsV2Ref = collection(db, COLLECTIONS.USERS, uid, "playlists_v2");

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
						// Для користувачів (як тестовий), які мігрували до появи поля migrationV2At
						logService.log("sync", "V2 user missing migration date. Setting it now to start the 3-day countdown.");
						try {
							await updateDoc(userDocRef, { migrationV2At: Date.now() });
						} catch (e) {
							logService.error("sync", "Failed to set fallback migration date", e);
						}
					} else if (Date.now() - cloudData.migrationV2At > THREE_DAYS_MS) {
						// Пройшло більше 3 днів — виконуємо Cleanup
						logService.log("sync", "3 days passed since V2 migration. Cleaning up old customPlaylists and meta fields...");
						try {
							await updateDoc(userDocRef, {
								"playlists.customPlaylists": deleteField(),
								migrationV2At: deleteField()
							});
							logService.log("sync", "Cleanup successful! Main document is now optimized.");
						} catch (e) {
							logService.error("sync", "Failed to cleanup old playlists", e);
						}
					} else {
						const daysLeft = ((cloudData.migrationV2At + THREE_DAYS_MS - Date.now()) / (1000 * 60 * 60 * 24)).toFixed(1);
						logService.log("sync", `Waiting for cleanup: ${daysLeft} days left.`);
					}
				}

				this.latestCloudMainDoc = cloudData;
				this.triggerCombinedCloudUpdate();

				// Auto-Healing: Якщо профіль пустий, але може бути історія (наприклад, після очищення кешу)
				if (!snapshot.exists() || (cloudData.progress?.totalCorrect || 0) === 0) {
					this.checkForOrphanedHistory(uid);
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
				const customPlaylists = snapshot.docs.map(doc => doc.data());
				this.latestCloudCustomPlaylists = customPlaylists;
				this.triggerCombinedCloudUpdate();
			},
			(error) => {
				logService.error("sync", "Playlists v2 listener error:", error);
			}
		);

		logService.log("sync", `Sync initialized for user: ${uid}`);

		// Додаємо доступ для дебагу в консолі ТІЛЬКИ в dev режимі
		if (dev && typeof window !== "undefined") {
			(window as any).wordApp = {
				sync: this,
				stats: statisticsService,
				restorePoints: (amount: number, reason: string) => this.restorePoints(amount, reason),
				recover: () => statisticsService.recoverProgressFromHistory(),
				getHistory: (start: string, end: string) => statisticsService.getHistoryByRange(start, end)
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

	/**
	 * Перевіряє, чи є "сирота" історія у користувача з пустим профілем.
	 * Якщо так — запускає відновлення.
	 */
	private async checkForOrphanedHistory(uid: string) {
		try {
			const historyRef = collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.HISTORY);
			// Перевіряємо наявність хоча б одного запису в історії
			const q = query(historyRef, limit(1));
			const snapshot = await getDocs(q);

			if (!snapshot.empty) {
				logService.warn("sync", "Found orphaned history for empty profile. Initiating recovery...");
				await statisticsService.recoverProgressFromHistory();
				this.uploadAll();
			}
		} catch (e) {
			logService.error("sync", "Error checking orphaned history:", e);
		}
	}

	/**
	 * Очистити локальні дані (при логауті)
	 */
	resetLocalData() {
		progressStore.reset();
		playlistStore.reset();
	}

	/**
	 * Вивантажити локальні зміни в хмару (з дебаунсом або примусово)
	 */
	async uploadAll(force = false) {
		if (!auth.currentUser || !this.isOnline) return;

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
		if (!auth.currentUser || this.isDownloading || !this.hasInitialData || !this.isOnline || this.isUploading) {
			return;
		}

		this.isUploading = true;
		this.pendingUpload = false;
		this.status = "syncing";
		
		const uid = auth.currentUser.uid;
		const userDocRef = doc(db, COLLECTIONS.USERS, uid);
		const profileRef = doc(db, COLLECTIONS.PROFILES, uid);
		const playlistsV2Ref = collection(db, COLLECTIONS.USERS, uid, "playlists_v2");

		try {
			// Паралельно отримуємо основні дані та дані за сьогодні
			const today = new Date().toISOString().split("T")[0];
			const historyRef = doc(db, COLLECTIONS.USERS, uid, COLLECTIONS.HISTORY, today);

			const [snapshot, historySnap] = await Promise.all([
				getDoc(userDocRef),
				getDoc(historyRef)
			]);

			const cloudData = snapshot.exists() ? snapshot.data() as UserCloudData : {};
			const cloudHistory = historySnap.exists() ? historySnap.data() : null;

			// Динамічно підтягуємо кешовані дані підколекції для мержу (без додаткового Read)
			const dbVersion = cloudData.playlists?.dbVersion || 1;
			const isV2 = dbVersion >= 2;

			// Safety Check: Якщо ми на v2, але плейлисти ще не завантажилися — скасовуємо аплоад,
			// щоб випадково не стерти дані через неповний мерж.
			if (isV2 && this.latestCloudCustomPlaylists === null) {
				logService.warn("sync", "Aborting upload: playlists_v2 not yet loaded, risking data loss.");
				this.isUploading = false;
				this.status = "error";
				return;
			}

			if (!cloudData.playlists) {
				cloudData.playlists = { dbVersion: dbVersion };
			}
			
			// Для v2 беремо з кешу підколекції, для v1 - те що є в самому документі
			cloudData.playlists.customPlaylists = isV2 
				? (this.latestCloudCustomPlaylists || []) 
				: (cloudData.playlists.customPlaylists || []);

			const localProgress = progressStore.value;
			const localSettings = settingsStore.value;
			const localActivity = progressStore.todayActivity;
			const localPlaylists: PlaylistState = playlistStore.getSnapshotState();

			// Smart Merge: Замість повної відмови від завантаження, ми об'єднуємо дані
			const mergedProgress = this.mergeProgress(localProgress, cloudData.progress || {});
			const mergedSettings = this.mergeSettings(localSettings, cloudData.settings || null);
			const mergedPlaylists = this.mergePlaylists(localPlaylists, cloudData.playlists || {});

			// Якщо хмарні дані значно відрізняються (наприклад, більше прогресу), 
			// ми оновлюємо локальний стор, але ТІЛЬКИ тими полями, які реально новіші в хмарі
			if ((cloudData.progress?.totalCorrect || 0) > localProgress.totalCorrect) {
				logService.warn("sync", "Cloud has more progress. Partial sync down.");
				progressStore._internalSet(mergedProgress);
				
				if (cloudHistory) {
					progressStore._internalSetActivity(cloudHistory);
				}
			}

			// Soft Backup Strategy: Ми НЕ видаляємо масив customPlaylists з об'єкта,
			// але через { merge: true } і той факт, що ми передаємо об'єкт без цього поля,
			// Firebase не зачепить і не перезапише заморожений бекап в хмарі.
			const mainDocPlaylists = {
				dbVersion: 2,
				systemPlaylists: mergedPlaylists.systemPlaylists,
				mistakeMetadata: mergedPlaylists.mistakeMetadata,
				updatedAt: mergedPlaylists.updatedAt
			};

			const mergedData = {
				settings: mergedSettings,
				progress: mergedProgress,
				playlists: mainDocPlaylists,
				lastSync: Date.now(),
			};

			// Публічний профіль для лідерборду
			const profileUpdate = this.prepareProfileUpdate(mergedProgress);

			// Атомарне оновлення через Batch для гарантування цілісності даних
			const batch = writeBatch(db);
			batch.set(userDocRef, mergedData, { merge: true });
			batch.set(profileRef, profileUpdate, { merge: true });
			if (localActivity) {
				batch.set(historyRef, localActivity, { merge: true });
			}

			// Зберігаємо кожен кастомний плейлист як окремий документ у підколекції
			const mergedIds = new Set(mergedPlaylists.customPlaylists.map(p => p.id));
			
			for (const playlist of mergedPlaylists.customPlaylists) {
				if (playlist && playlist.id) {
					// Оптимізація записів (Dirty check)
					const cloudPlaylist = this.latestCloudCustomPlaylists?.find(p => p.id === playlist.id);
					const isChanged = !cloudPlaylist || JSON.stringify(cloudPlaylist) !== JSON.stringify(playlist);

					if (isChanged) {
						const pRef = doc(playlistsV2Ref, playlist.id);
						batch.set(pRef, playlist, { merge: true });
					}
				}
			}

			// Оптимізоване видалення: видаляємо тільки те, що є в локальному кеші хмари,
			// але вже немає в mergedIds (видалено локально)
			if (isV2 && this.latestCloudCustomPlaylists) {
				for (const cloudPlaylist of this.latestCloudCustomPlaylists) {
					if (!mergedIds.has(cloudPlaylist.id)) {
						const pRef = doc(playlistsV2Ref, cloudPlaylist.id);
						batch.delete(pRef);
					}
				}
			}

			// Double check auth right before commit to avoid Permission Denied during logout
			if (!auth.currentUser) {
				logService.warn("sync", "Auth lost right before commit, aborting upload");
				return;
			}

			try {
				await batch.commit();
			} catch (err) {
				this.consecutiveFailures++;
				logService.error("sync", `Atomic Sync Failed (${this.consecutiveFailures}):`, err);
				throw err;
			}

			this.retryCount = 0;
			this.consecutiveFailures = 0; // Успіх! Скидаємо лічильник
			this.lastSyncAttempt = Date.now();
			this.status = "up-to-date";
			logService.log("sync", "Upload successful");

			// Після успішного вивантаження перевіряємо, чи не прийшли нові дані з хмари (VULN_06)
			if (this.pendingCloudUpdate) {
				const dataToProcess = this.pendingCloudUpdate;
				this.pendingCloudUpdate = null;
				logService.log("sync", "Processing queued cloud update after upload");
				this.handleCloudUpdate(dataToProcess);
			}
		} catch (e: any) {
			// Якщо помилка доступу сталася під час логауту — ігноруємо її (вона очікувана)
			if (e?.code === 'permission-denied' && !auth.currentUser) {
				logService.log("sync", "Sync aborted: user logged out during upload");
			} else {
				logService.error("sync", "Sync Upload Error:", e);
			}
			this.status = "error";
			this.isUploading = false; // Важливо: дозволити наступні спроби
			this.scheduleRetry();
		} finally {
			this.isUploading = false;

			// Якщо під час вивантаження прийшов запит на нове вивантаження — запускаємо його
			if (this.pendingUpload) {
				this.performUpload();
			} else if (this.pendingCloudUpdate) {
				// На випадок помилки або якщо немає нових вивантажень, перевіряємо чергу вхідних даних
				const dataToProcess = this.pendingCloudUpdate;
				this.pendingCloudUpdate = null;
				this.handleCloudUpdate(dataToProcess);
			}
		}
	}

	private handleCloudUpdate(cloudData: UserCloudData) {
		if (!auth.currentUser) return;
		
		if (this.isUploading) {
			logService.log("sync", "Upload in progress, queuing cloud update");
			this.pendingCloudUpdate = cloudData;
			return;
		}

		this.isDownloading = true;

		try {
			if (cloudData.settings) {
				const localSettings = settingsStore.value;
				const mergedSettings = this.mergeSettings(localSettings, cloudData.settings);
				
				// Якщо результат злиття відрізняється від локального, оновлюємо стор
				// Це важливо для відновлення полів типу lastSeenFollowerAt
				if (JSON.stringify(mergedSettings) !== JSON.stringify(localSettings)) {
					logService.log("sync", "Cloud settings merged into local state");
					settingsStore._internalUpdate(mergedSettings);
				} else {
					logService.log("sync", "Local settings are already up-to-date with cloud merge");
				}
			}

			if (cloudData.progress) {
				const result = ProgressStateSchema.safeParse(cloudData.progress);
				if (result.success) {
					const merged = this.mergeProgress(progressStore.value, result.data);
					progressStore._internalSet(merged);
				} else {
					logService.error("sync", "Cloud progress validation failed:", result.error);
					logService.logToRemote("sync_validation_error", { 
						type: "progress", 
						error: result.error.message 
					});
				}
			}

			if (cloudData.playlists) {
				const localPlaylists = playlistStore.getSnapshotState();
				const merged = this.mergePlaylists(localPlaylists, cloudData.playlists);
				
				// Порівнюємо результат з поточним локальним станом
				if (merged.updatedAt > (localPlaylists.updatedAt || 0)) {
					logService.log("sync", "Cloud playlists merged into local state");
					playlistStore._internalSet(merged);
				}
			}

			// Після завантаження налаштувань перевіряємо сповіщення про підписників
			friendsStore.checkFollowerNotifications();

			logService.log("sync", "Cloud update processed");
		} catch (e) {
			logService.error("sync", "Sync Download Error:", e);
		} finally {
			this.isDownloading = false;
		}
	}

	/**
	 * Логіка об'єднання налаштувань на основі updatedAt
	 */
	private mergeSettings(local: AppSettings, cloud: AppSettings | null): AppSettings {
		if (!cloud) return local;

		try {
			const cloudSettings = AppSettingsSchema.parse(cloud);
			const cloudTime = cloudSettings.updatedAt || 0;
			const localTime = local.updatedAt || 0;

			// Використовуємо глибокий мерж для захисту вкладених полів (VULN_03)
			if (cloudTime > localTime) {
				return this.deepMergeSettings(local, cloudSettings);
			} else {
				return this.deepMergeSettings(cloudSettings, local);
			}
		} catch (e) {
			logService.error("sync", "Failed to parse cloud settings during merge", e);
		}
		return local;
	}

	private deepMergeSettings(base: AppSettings, updates: AppSettings): AppSettings {
		const result = { ...base, ...updates };

		// Глибокий мерж для voicePreferences
		if (base.voicePreferences && updates.voicePreferences) {
			result.voicePreferences = {
				...base.voicePreferences,
				...updates.voicePreferences
			};
		}

		// CRDT Fix: lastSeenFollowerAt must always be monotonic (take max)
		const maxLastSeen = Math.max(base.lastSeenFollowerAt || 0, updates.lastSeenFollowerAt || 0);
		if (maxLastSeen > result.lastSeenFollowerAt) {
			logService.log("sync", `Restoring lastSeenFollowerAt from history: ${result.lastSeenFollowerAt} -> ${maxLastSeen}`);
			result.lastSeenFollowerAt = maxLastSeen;
		}

		return result;
	}

	private mergeProgress(local: ProgressState, cloud: ProgressState): ProgressState {
		// Обчислюємо сумарні показники з рівнів для валідації цілісності
		const levelStats = this.mergeLevelStats(local.levelStats, cloud.levelStats || {});
		const sumLevelCorrect = Object.values(levelStats).reduce((sum, s) => sum + s.totalCorrect, 0);
		
		// Для лічильників беремо максимум, але не менше суми по рівнях (Integrity Protection)
		const baseTotalCorrect = Math.max(local.totalCorrect, cloud.totalCorrect || 0);
		const restored = Math.max(local.restoredPoints || 0, cloud.restoredPoints || 0);
		
		// Total Correct = Сума по рівнях + відновлені бали
		const validatedTotalCorrect = Math.max(baseTotalCorrect, sumLevelCorrect + restored);

		// Монотонний мердж для стріків та дат
		const validatedStreak = Math.max(local.streak || 0, cloud.streak || 0);
		const validatedDailyCorrect = Math.max(local.dailyCorrect || 0, cloud.dailyCorrect || 0);
		
		// Вибираємо пізнішу дату
		const validatedLastCorrectDate = (local.lastCorrectDate || "") >= (cloud.lastCorrectDate || "") 
			? (local.lastCorrectDate || null) : (cloud.lastCorrectDate || null);
		
		const validatedLastStreakUpdateDate = (local.lastStreakUpdateDate || "") >= (cloud.lastStreakUpdateDate || "")
			? (local.lastStreakUpdateDate || null) : (cloud.lastStreakUpdateDate || null);

		const merged: ProgressState = {
			...local,
			...cloud,
			totalCorrect: validatedTotalCorrect,
			totalAttempts: Math.max(local.totalAttempts, cloud.totalAttempts || 0),
			restoredPoints: restored,
			streak: validatedStreak,
			dailyCorrect: validatedDailyCorrect,
			lastCorrectDate: validatedLastCorrectDate,
			lastStreakUpdateDate: validatedLastStreakUpdateDate,
			restorationHistory: this.mergeArrays(local.restorationHistory || [], cloud.restorationHistory || [], (i) => (i.timestamp + i.reason).toString()),
			bestStreak: Math.max(local.bestStreak, cloud.bestStreak || 0),
			bestCorrectStreak: Math.max(local.bestCorrectStreak, cloud.bestCorrectStreak || 0),
			lastUpdated: Math.max(local.lastUpdated, cloud.lastUpdated || 0),
			words: this.mergeWordProgress(local.words, cloud.words || {}),
			levelStats: levelStats,
		};
		return merged;
	}

	private mergeWordProgress(local: Record<string, any>, cloud: Record<string, any>) {
		const merged = { ...cloud };
		for (const [key, lVal] of Object.entries(local)) {
			const cVal = cloud[key];
			if (!cVal || lVal.correctCount > cVal.correctCount) {
				merged[key] = lVal;
			}
		}
		return merged;
	}

	private mergeLevelStats(local: Record<string, LevelStats>, cloud: Record<string, LevelStats>) {
		const merged = { ...cloud };
		
		for (const key of Object.keys(merged)) {
			if (key.includes(",") || key === "ALL") {
				logService.log("sync", `Ignoring dirty cloud key during merge: ${key}`);
				delete merged[key];
			}
		}

		for (const [lvl, l] of Object.entries(local)) {
			const c = merged[lvl];
			if (!c) {
				merged[lvl] = l;
			} else {
				if (l.totalCorrect >= c.totalCorrect) {
					merged[lvl] = l;
				} else {
					merged[lvl] = c;
				}
			}
		}
		return merged;
	}

	/**
	 * Ручне нарахування балів (для відновлення даних або компенсацій).
	 * Додає бали до restoredPoints та totalCorrect.
	 */
	async restorePoints(amount: number, reason: string) {
		if (!auth.currentUser || amount <= 0) return;
		
		const record = {
			amount,
			reason,
			timestamp: Date.now(),
			adminId: "system"
		};

		// Оновлюємо локальний стан
		const current = progressStore.value;
		const newRestoredTotal = (current.restoredPoints || 0) + amount;
		const newTotalCorrect = current.totalCorrect + amount;
		
		const newHistory = [...(current.restorationHistory || []), record].slice(-10);

		progressStore._internalSet({
			...current,
			totalCorrect: newTotalCorrect,
			restoredPoints: newRestoredTotal,
			restorationHistory: newHistory
		});

		this.uploadAll();
		logService.log("sync", `Restored ${amount} points. Reason: ${reason}`);
	}

	private mergePlaylists(local: PlaylistState, cloud: UserCloudData['playlists']): PlaylistState {
		if (!cloud) return local;

		try {
			const validCloud = PlaylistStateSchema.parse(cloud);
			const cloudTime = validCloud.updatedAt || 0;
			const localTime = local.updatedAt || 0;

			if (cloudTime > localTime) {
				logService.log("sync", "Cloud playlists are newer, accepting cloud state");
				return validCloud;
			} else if (localTime > cloudTime) {
				logService.log("sync", "Local playlists are newer, keeping local state");
				return local;
			}

			return {
				...local,
				customPlaylists: this.mergeArrays(local.customPlaylists, validCloud.customPlaylists) as (WordKey | CustomWord)[],
				systemPlaylists: {
					favorites: this.mergePlaylistObjects(local.systemPlaylists.favorites, validCloud.systemPlaylists.favorites),
					extra: this.mergePlaylistObjects(local.systemPlaylists.extra, validCloud.systemPlaylists.extra),
					mistakes: this.mergePlaylistObjects(local.systemPlaylists.mistakes, validCloud.systemPlaylists.mistakes),
				},
				mistakeMetadata: { ...validCloud.mistakeMetadata, ...local.mistakeMetadata },
				updatedAt: localTime
			};
		} catch (e) {
			logService.error("sync", "Failed to parse cloud playlists during merge", e);
			return local;
		}
	}

	private mergePlaylistObjects(local: Partial<Playlist>, cloud: Partial<Playlist>): Playlist {
		return {
			...cloud,
			...local,
			words: this.mergeArrays(local.words || [], cloud.words || [], (w) => typeof w === "string" ? w : w.id)
		} as Playlist;
	}

	private mergeArrays<T>(local: T[], cloud: T[], getId: (item: T) => string = (i: any) => i.id): T[] {
		const map = new Map<string, T>();
		cloud.forEach((item) => map.set(getId(item), item));
		local.forEach((item) => map.set(getId(item), item));
		return Array.from(map.values());
	}

	private prepareProfileUpdate(progress: ProgressState) {
		const displayName = auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "User";
		
		const update: Record<string, string | number | boolean | null | ReturnType<typeof serverTimestamp>> = {
			displayName,
			displayNameLower: displayName.toLowerCase(),
			photoURL: auth.currentUser?.photoURL || null,
			isAnonymous: auth.currentUser?.isAnonymous || false,
			totalCorrect: progress.totalCorrect,
			totalAttempts: progress.totalAttempts,
			bestStreak: progress.bestStreak,
			bestCorrectStreak: progress.bestCorrectStreak,
			accuracy: Math.round((progress.totalCorrect / (progress.totalAttempts || 1)) * 100),
			updatedAt: serverTimestamp(),
		};

		// Додаємо статистику по рівнях для лідерборду
		for (const [lvl, stats] of Object.entries(progress.levelStats)) {
			update[`level_${lvl}_totalCorrect`] = stats.totalCorrect;
			update[`level_${lvl}_bestCorrectStreak`] = stats.bestCorrectStreak;
			update[`level_${lvl}_accuracy`] = stats.totalAttempts > 0 
				? Math.round((stats.totalCorrect / stats.totalAttempts) * 100) : 0;
		}

		return update;
	}

	private scheduleRetry() {
		if (this.retryCount >= RETRY_CONFIG.maxAttempts || this.consecutiveFailures >= 5) {
			logService.error("sync", "Max sync retries reached. Stopping automatic attempts.");
			this.status = "error";
			return;
		}
		const delay = Math.min(RETRY_CONFIG.baseDelay * Math.pow(2, this.retryCount), RETRY_CONFIG.maxDelay);
		this.retryCount++;
		setTimeout(() => {
			if (this.isOnline && auth.currentUser) this.performUpload();
		}, delay);
	}

	getStatus() {
		return {
			status: this.status,
			isOnline: this.isOnline,
			lastSync: this.lastSyncAttempt,
		};
	}
}

export const SyncService = new SyncServiceClass();