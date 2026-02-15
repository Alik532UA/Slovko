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

/**
 * Сервіс для синхронізації локальних даних з Firestore.
 * Оброблений згідно з принципами SSoT та чистої архітектури.
 */
class SyncServiceClass {
	private unsubscribe: Unsubscribe | null = null;
	private uploadTimeout: ReturnType<typeof setTimeout> | null = null;
	private retryCount = 0;

	// Реактивні стани (Runes)
	status = $state<SyncStatus>("idle");
	isOnline = $state(typeof navigator !== "undefined" ? navigator.onLine : true);
	lastSyncAttempt = $state(0);
	hasInitialData = $state(false);

	private isDownloading = false;
	private isUploading = false;
	private pendingUpload = false;
	private pendingCloudUpdate: any = null;
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

		const userDocRef = doc(db, COLLECTIONS.USERS, uid);

		this.unsubscribe = onSnapshot(
			userDocRef,
			(snapshot) => {
				const cloudData = snapshot.exists() ? snapshot.data() : {};
				this.handleCloudUpdate(cloudData);
				this.hasInitialData = true;

				// Auto-Healing: Якщо профіль пустий, але може бути історія (наприклад, після очищення кешу)
				if (!snapshot.exists() || (cloudData.progress?.totalCorrect || 0) === 0) {
					this.checkForOrphanedHistory(uid);
				}

				if (this.status === "syncing") this.status = "up-to-date";
			},
			(error) => {
				logService.error("sync", "Snapshot listener error:", error);
				this.status = "error";
				if (this.isOnline) this.scheduleRetry();
			},
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

		try {
			// Паралельно отримуємо основні дані та дані за сьогодні
			const today = new Date().toISOString().split("T")[0];
			const historyRef = doc(db, COLLECTIONS.USERS, uid, COLLECTIONS.HISTORY, today);

			const [snapshot, historySnap] = await Promise.all([
				getDoc(userDocRef),
				getDoc(historyRef)
			]);

			const cloudData = snapshot.exists() ? snapshot.data() : {};
			const cloudHistory = historySnap.exists() ? historySnap.data() : null;

			const localProgress = progressStore.value;
			const localSettings = settingsStore.value;
			const localActivity = progressStore.todayActivity;
			const localPlaylists: PlaylistState = playlistStore.getSnapshotState();

			// Smart Merge: Замість повної відмови від завантаження, ми об'єднуємо дані
			// Бали беремо найбільші (хмара vs локально), налаштування - найновіші
			const mergedProgress = this.mergeProgress(localProgress, cloudData.progress || {});
			const mergedSettings = this.mergeSettings(localSettings, cloudData.settings || null);
			const mergedPlaylists = this.mergePlaylists(localPlaylists, cloudData.playlists || {});

			// Якщо хмарні дані значно відрізняються (наприклад, більше прогресу), 
			// ми оновлюємо локальний стор, але ТІЛЬКИ тими полями, які реально новіші в хмарі
			if (cloudData.progress?.totalCorrect > localProgress.totalCorrect) {
				logService.warn("sync", "Cloud has more progress. Partial sync down.");
				progressStore._internalSet(mergedProgress);
				
				if (cloudHistory) {
					progressStore._internalSetActivity(cloudHistory);
				}
			}

			const mergedData = {
				settings: mergedSettings,
				progress: mergedProgress,
				playlists: mergedPlaylists,
				lastSync: Date.now(),
			};

			// Публічний профіль для лідерборду
			const profileUpdate = this.prepareProfileUpdate(mergedProgress);

			// Атомарне оновлення через Batch для гарантування цілісності даних
			const batch = writeBatch(db);
			batch.set(userDocRef, mergedData, { merge: true });
			batch.set(profileRef, profileUpdate, { merge: true });
			batch.set(historyRef, localActivity, { merge: true });

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

	private handleCloudUpdate(cloudData: any) {
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
				const localPlaylists = playlistStore.allPlaylists; // Force reactive access if needed
				const merged = this.mergePlaylists(playlistStore.getSnapshotState(), cloudData.playlists);
				
				// Порівнюємо результат з поточним локальним станом
				// (Ми використовуємо JSON.stringify для швидкої перевірки змін об'єктів)
				if (merged.updatedAt > (playlistStore.getSnapshotState().updatedAt || 0)) {
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
	private mergeSettings(local: AppSettings, cloud: any): AppSettings {
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
		// Це вирішує проблему, коли новий пристрій (local=0) перезаписує історію з хмари,
		// навіть якщо локальні налаштування формально "новіші" (через auto-save при старті).
		const maxLastSeen = Math.max(base.lastSeenFollowerAt || 0, updates.lastSeenFollowerAt || 0);
		if (maxLastSeen > result.lastSeenFollowerAt) {
			logService.log("sync", `Restoring lastSeenFollowerAt from history: ${result.lastSeenFollowerAt} -> ${maxLastSeen}`);
			result.lastSeenFollowerAt = maxLastSeen;
		}

		return result;
	}

	private mergeProgress(local: ProgressState, cloud: any): ProgressState {
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
		
		// Вибираємо пізнішу дату (YYYY-MM-DD порівнюється як рядки коректно)
		// Гарантуємо null замість undefined для Firebase (VULN_08)
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
			restorationHistory: this.mergeArrays(local.restorationHistory || [], cloud.restorationHistory || [], (i) => i.timestamp + i.reason),
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

	private mergeLevelStats(local: Record<string, LevelStats>, cloud: Record<string, any>) {
		const merged = { ...cloud };
		
		// Видаляємо "брудні" ключі з хмарних даних перед злиттям,
		// щоб вони не воскресли і не додали зайвих балів до суми.
		for (const key of Object.keys(merged)) {
			if (key.includes(",") || key === "ALL") {
				logService.log("sync", `Ignoring dirty cloud key during merge: ${key}`);
				delete merged[key];
			}
		}

		for (const [lvl, l] of Object.entries(local)) {
			const c = merged[lvl] as LevelStats | undefined;
			if (!c) {
				merged[lvl] = l;
			} else {
				// Вибираємо об'єкт з більшим прогресом як основний (VULN_08)
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
		const uid = auth.currentUser.uid;
		
		const record = {
			amount,
			reason,
			timestamp: Date.now(),
			adminId: "system" // Можна замінити на реальний ID адміна, якщо викликається з адмінки
		};

		// Оновлюємо локальний стан
		const current = progressStore.value;
		const newRestoredTotal = (current.restoredPoints || 0) + amount;
		const newTotalCorrect = current.totalCorrect + amount;
		
		// Обмежуємо історію останніми 10 записами
		const newHistory = [...(current.restorationHistory || []), record].slice(-10);

		progressStore._internalSet({
			...current,
			totalCorrect: newTotalCorrect,
			restoredPoints: newRestoredTotal,
			restorationHistory: newHistory
		});

		// Примусова синхронізація
		this.uploadAll();
		logService.log("sync", `Restored ${amount} points. Reason: ${reason}`);
	}

	private mergePlaylists(local: PlaylistState, cloud: any): PlaylistState {
		if (!cloud) return local;

		try {
			const validCloud = PlaylistStateSchema.parse(cloud);
			const cloudTime = validCloud.updatedAt || 0;
			const localTime = local.updatedAt || 0;

			// LWW (Last Write Wins) на рівні всього об'єкта плейлістів
			// Це найнадійніший спосіб дозволити видалення слів (VULN_03)
			if (cloudTime > localTime) {
				logService.log("sync", "Cloud playlists are newer, accepting cloud state");
				return validCloud;
			} else if (localTime > cloudTime) {
				logService.log("sync", "Local playlists are newer, keeping local state");
				return local;
			}

			// Якщо часи однакові (напр. 0), робимо безпечне злиття масивів (Union)
			return {
				...local,
				customPlaylists: this.mergeArrays(local.customPlaylists, validCloud.customPlaylists),
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

	private mergePlaylistObjects(local: any, cloud: any) {
		return {
			...cloud,
			...local,
			words: this.mergeArrays(local.words || [], cloud.words || [], (w: any) => typeof w === "string" ? w : w.id)
		};
	}

	private mergeArrays(local: any[], cloud: any[], getId: (item: any) => string = (i) => i.id) {
		const map = new Map();
		cloud.forEach((item) => map.set(getId(item), item));
		local.forEach((item) => map.set(getId(item), item));
		return Array.from(map.values());
	}

	private prepareProfileUpdate(progress: ProgressState) {
		const displayName = auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "User";
		
		const update: any = {
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