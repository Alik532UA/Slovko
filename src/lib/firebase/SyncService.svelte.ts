import {
	doc,
	setDoc,
	onSnapshot,
	getDoc,
	getDocs,
	collection,
	serverTimestamp,
	query,
	where,
	limit,
	writeBatch,
	type Unsubscribe,
} from "firebase/firestore";
import { db, auth } from "./config";
import { settingsStore } from "../stores/settingsStore.svelte";
import { progressStore } from "../stores/progressStore.svelte";
import { playlistStore } from "../stores/playlistStore.svelte";
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
	private consecutiveFailures = 0;
	private currentUid: string | null = null;
	private boundHandleVisibilityChange: (() => void) | null = null;

	constructor() {
		if (typeof window !== "undefined") {
			window.addEventListener("online", () => this.handleNetworkChange(true));
			window.addEventListener("offline", () => this.handleNetworkChange(false));
			
			// Надійний спосіб збереження при закритті/згортанні
			this.boundHandleVisibilityChange = () => {
				if (document.visibilityState === "hidden" && (this.uploadTimeout || this.status === "syncing")) {
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
	uploadAll(force = false) {
		if (!auth.currentUser || this.isDownloading || !this.isOnline) return;

		if (this.uploadTimeout) clearTimeout(this.uploadTimeout);

		if (force) {
			this.performUpload();
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
			const localPlaylists: PlaylistState = {
				customPlaylists: playlistStore.customPlaylists,
				systemPlaylists: playlistStore.systemPlaylists,
				mistakeMetadata: (playlistStore as any).mistakeMetadata || {},
			};

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
		} catch (e) {
			logService.error("sync", "Sync Upload Error:", e);
			this.status = "error";
			this.isUploading = false; // Важливо: дозволити наступні спроби
			this.scheduleRetry();
		} finally {
			this.isUploading = false;
		}
	}

	private handleCloudUpdate(cloudData: any) {
		if (this.isUploading || !auth.currentUser) return;
		this.isDownloading = true;

		try {
			if (cloudData.settings) {
				const result = AppSettingsSchema.safeParse(cloudData.settings);
				if (result.success) {
					const cloudSettings = result.data;
					const localSettings = settingsStore.value;

					if (cloudSettings.updatedAt >= (localSettings.updatedAt || 0)) {
						settingsStore._internalUpdate(cloudSettings);
					} else {
						logService.log("sync", "Local settings are newer, skipping cloud settings update");
						this.uploadAll();
					}
				} else {
					logService.error("sync", "Cloud settings validation failed:", result.error);
					logService.logToRemote("sync_validation_error", { 
						type: "settings", 
						error: result.error.message 
					});
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
				// playlistStore._internalSet вже має вбудовану валідацію через Zod
				playlistStore._internalSet(cloudData.playlists);
			}

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

		const merged: ProgressState = {
			...local,
			...cloud,
			totalCorrect: validatedTotalCorrect,
			totalAttempts: Math.max(local.totalAttempts, cloud.totalAttempts || 0),
			restoredPoints: restored,
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
		for (const [lvl, l] of Object.entries(local)) {
			const c = cloud[lvl];
			if (!c) {
				merged[lvl] = l;
			} else {
				merged[lvl] = {
					totalCorrect: Math.max(l.totalCorrect, c.totalCorrect || 0),
					totalAttempts: Math.max(l.totalAttempts, c.totalAttempts || 0),
					bestCorrectStreak: Math.max(l.bestCorrectStreak, c.bestCorrectStreak || 0),
					currentCorrectStreak: Math.max(l.currentCorrectStreak, c.currentCorrectStreak || 0),
				};
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
		// Тут використовуємо логіку нормалізації через Zod для хмарних даних
		const validCloud = PlaylistStateSchema.parse(cloud);
		
		return {
			customPlaylists: this.mergeArrays(local.customPlaylists, validCloud.customPlaylists),
			systemPlaylists: {
				favorites: this.mergePlaylistObjects(local.systemPlaylists.favorites, validCloud.systemPlaylists.favorites),
				extra: this.mergePlaylistObjects(local.systemPlaylists.extra, validCloud.systemPlaylists.extra),
				mistakes: this.mergePlaylistObjects(local.systemPlaylists.mistakes, validCloud.systemPlaylists.mistakes),
			},
			mistakeMetadata: { ...validCloud.mistakeMetadata, ...local.mistakeMetadata }
		};
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