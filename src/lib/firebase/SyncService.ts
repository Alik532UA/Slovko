import {
	doc,
	setDoc,
	onSnapshot,
	getDoc,
	serverTimestamp,
	type Unsubscribe,
} from "firebase/firestore";
import { db, auth } from "./config";
import { settingsStore } from "../stores/settingsStore.svelte";
import { progressStore } from "../stores/progressStore.svelte";
import { playlistStore } from "../stores/playlistStore.svelte";
import { logService } from "../services/logService";
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

	constructor() {
		if (typeof window !== "undefined") {
			window.addEventListener("online", () => this.handleNetworkChange(true));
			window.addEventListener("offline", () => this.handleNetworkChange(false));
		}
	}

	/**
	 * Ініціалізація синхронізації для користувача
	 */
	init(uid: string) {
		this.stop();
		this.hasInitialData = false;
		this.status = "syncing";

		const userDocRef = doc(db, COLLECTIONS.USERS, uid);

		this.unsubscribe = onSnapshot(
			userDocRef,
			(snapshot) => {
				const cloudData = snapshot.exists() ? snapshot.data() : {};
				this.handleCloudUpdate(cloudData);
				this.hasInitialData = true;
				if (this.status === "syncing") this.status = "up-to-date";
			},
			(error) => {
				logService.error("sync", "Snapshot listener error:", error);
				this.status = "error";
				if (this.isOnline) this.scheduleRetry();
			},
		);

		logService.log("sync", `Sync initialized for user: ${uid}`);
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
	 * Очистити локальні дані (при логауті)
	 */
	resetLocalData() {
		progressStore.reset();
		playlistStore.reset();
	}

	/**
	 * Вивантажити локальні зміни в хмару (з дебаунсом)
	 */
	uploadAll() {
		if (!auth.currentUser || this.isDownloading || !this.isOnline) return;

		if (this.uploadTimeout) clearTimeout(this.uploadTimeout);

		this.uploadTimeout = setTimeout(() => {
			this.performUpload();
		}, 3000);
	}

	private async performUpload() {
		if (!auth.currentUser || this.isDownloading || !this.hasInitialData || !this.isOnline) {
			return;
		}

		this.isUploading = true;
		this.status = "syncing";
		
		const uid = auth.currentUser.uid;
		const userDocRef = doc(db, COLLECTIONS.USERS, uid);
		const profileRef = doc(db, COLLECTIONS.PROFILES, uid);

		try {
			const snapshot = await getDoc(userDocRef);
			const cloudData = snapshot.exists() ? snapshot.data() : {};

			const localProgress = progressStore.value;
			const localSettings = settingsStore.value;
			const localPlaylists: PlaylistState = {
				customPlaylists: playlistStore.customPlaylists,
				systemPlaylists: playlistStore.systemPlaylists,
				mistakeMetadata: (playlistStore as any).mistakeMetadata || {},
			};

			// Захист: не перетирати прогрес, якщо в хмарі він більший
			if (cloudData.progress?.totalCorrect > localProgress.totalCorrect) {
				logService.warn("sync", "Cloud has more progress. Syncing down.");
				this.handleCloudUpdate(cloudData);
				return;
			}

			const mergedData = this.mergeData(
				{ settings: localSettings, progress: localProgress, playlists: localPlaylists },
				cloudData
			);

			// Публічний профіль для лідерборду
			const profileUpdate = this.prepareProfileUpdate(localProgress);

			await Promise.all([
				setDoc(userDocRef, mergedData, { merge: true }),
				setDoc(profileRef, profileUpdate, { merge: true }),
			]);

			this.retryCount = 0;
			this.lastSyncAttempt = Date.now();
			this.status = "up-to-date";
			logService.log("sync", "Upload successful");
		} catch (e) {
			logService.error("sync", "Sync Upload Error:", e);
			this.status = "error";
			this.scheduleRetry();
		} finally {
			this.isUploading = false;
		}
	}

	private handleCloudUpdate(cloudData: any) {
		if (this.isUploading) return;
		this.isDownloading = true;

		try {
			if (cloudData.settings) {
				const result = AppSettingsSchema.safeParse(cloudData.settings);
				if (result.success) settingsStore._internalUpdate(result.data);
			}

			if (cloudData.progress) {
				const result = ProgressStateSchema.safeParse(cloudData.progress);
				if (result.success) {
					const merged = this.mergeProgress(progressStore.value, result.data);
					progressStore._internalSet(merged);
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
	 * Логіка об'єднання даних
	 */
	private mergeData(local: any, cloud: any) {
		const cloudIsNewer = (cloud.lastSync || 0) > (local.lastSync || 0);

		return {
			settings: cloudIsNewer
				? { ...local.settings, ...cloud.settings }
				: { ...cloud.settings, ...local.settings },
			progress: this.mergeProgress(local.progress, cloud.progress || {}),
			playlists: this.mergePlaylists(local.playlists, cloud.playlists || {}),
			lastSync: Date.now(),
		};
	}

	private mergeProgress(local: ProgressState, cloud: any): ProgressState {
		// Для лічильників беремо максимум
		const merged: ProgressState = {
			...local,
			...cloud,
			totalCorrect: Math.max(local.totalCorrect, cloud.totalCorrect || 0),
			totalAttempts: Math.max(local.totalAttempts, cloud.totalAttempts || 0),
			bestStreak: Math.max(local.bestStreak, cloud.bestStreak || 0),
			bestCorrectStreak: Math.max(local.bestCorrectStreak, cloud.bestCorrectStreak || 0),
			lastUpdated: Math.max(local.lastUpdated, cloud.lastUpdated || 0),
			words: this.mergeWordProgress(local.words, cloud.words || {}),
			levelStats: this.mergeLevelStats(local.levelStats, cloud.levelStats || {}),
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
					currentCorrectStreak: 0,
				};
			}
		}
		return merged;
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
		if (this.retryCount >= RETRY_CONFIG.maxAttempts) return;
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