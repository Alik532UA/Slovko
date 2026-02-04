import {
	doc,
	setDoc,
	onSnapshot,
	getDoc,
	serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "./config";
import { settingsStore } from "../stores/settingsStore.svelte";
import { progressStore } from "../stores/progressStore.svelte";
import { playlistStore } from "../stores/playlistStore.svelte";
import { logService } from "../services/logService";

const COLLECTIONS = {
	USERS: "users",
	DATA: "userData",
};

/** Retry configuration */
const RETRY_CONFIG = {
	maxAttempts: 3,
	baseDelay: 1000,
	maxDelay: 10000,
};

/**
 * Сервіс для синхронізації локальних даних з Firestore
 */
export const SyncService = {
	private: {
		unsubscribe: null as (() => void) | null,
		isUploading: false,
		isDownloading: false,
		uploadTimeout: null as ReturnType<typeof setTimeout> | null,
		retryCount: 0,
		isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
		lastSyncAttempt: 0,
		offlineNotificationShown: false,
		hasInitialData: false, // ПРАПОРЕЦЬ: чи отримали ми перші дані з хмари для поточного юзера
	},

	/**
	 * Ініціалізація синхронізації для конкретного користувача
	 */
	init(uid: string) {
		if (this.private.unsubscribe) this.private.unsubscribe();
		this.private.hasInitialData = false; // Скидаємо для нового юзера

		// Слухаємо зміни в документі користувача
		const userDocRef = doc(db, COLLECTIONS.USERS, uid);

		// Відстежуємо стан мережі
		if (typeof window !== "undefined") {
			window.addEventListener("online", this.handleOnline.bind(this));
			window.addEventListener("offline", this.handleOffline.bind(this));
			this.private.isOnline = navigator.onLine;
		}

		this.private.unsubscribe = onSnapshot(
			userDocRef,
			(snapshot) => {
				const cloudData = snapshot.exists() ? snapshot.data() : {};
				this.handleCloudUpdate(cloudData);
				this.private.hasInitialData = true; // Тепер ми знаємо стан хмари і можемо аплоадити
			},
			(error) => {
				logService.warn("sync", "Snapshot listener error:", error);
				// При помилці спробуємо перепідключитись
				if (this.private.isOnline) {
					this.scheduleRetry();
				}
			},
		);

		logService.log("sync", `Sync initialized for user: ${uid}`);
	},

	/**
	 * Обробка переходу в онлайн
	 */
	handleOnline() {
		logService.log("sync", "Network: online");
		this.private.isOnline = true;
		this.private.offlineNotificationShown = false;
		this.private.retryCount = 0;

		// Спробувати синхронізувати при поверненні онлайн
		this.uploadAll();
	},

	/**
	 * Обробка переходу в офлайн
	 */
	handleOffline() {
		logService.log("sync", "Network: offline");
		this.private.isOnline = false;
	},

	/**
	 * Планування повторної спроби з експоненційним відступом
	 */
	scheduleRetry() {
		if (this.private.retryCount >= RETRY_CONFIG.maxAttempts) {
			logService.warn("sync", "Max retry attempts reached");
			return;
		}

		const delay = Math.min(
			RETRY_CONFIG.baseDelay * Math.pow(2, this.private.retryCount),
			RETRY_CONFIG.maxDelay,
		);

		this.private.retryCount++;
		logService.log(
			"sync",
			`Scheduling retry #${this.private.retryCount} in ${delay}ms`,
		);

		setTimeout(() => {
			if (this.private.isOnline && auth.currentUser) {
				this.performUpload();
			}
		}, delay);
	},

	/**
	 * Зупинка синхронізації
	 */
	stop() {
		if (this.private.unsubscribe) {
			this.private.unsubscribe();
			this.private.unsubscribe = null;
		}

		// Видаляємо слухачі мережі
		if (typeof window !== "undefined") {
			window.removeEventListener("online", this.handleOnline.bind(this));
			window.removeEventListener("offline", this.handleOffline.bind(this));
		}

		// Скидаємо стан
		this.private.retryCount = 0;
		this.private.offlineNotificationShown = false;

		logService.log("sync", "Sync stopped");
	},

	/**
	 * Очистити локальні дані (викликається при виході)
	 */
	resetLocalData() {
		progressStore.reset();
		playlistStore.reset();
	},

	/**
	 * Вивантажити всі локальні дані в хмару (Merge)
	 * Використовує debounce (3 сек) для запобігання частим запитам
	 */
	uploadAll() {
		if (!auth.currentUser || this.private.isDownloading) return;

		// Якщо офлайн — не намагаємось, дані збережуться локально
		if (!this.private.isOnline) {
			logService.log("sync", "Offline, skipping upload");
			return;
		}

		if (this.private.uploadTimeout) {
			clearTimeout(this.private.uploadTimeout);
		}

		this.private.uploadTimeout = setTimeout(() => {
			this.performUpload();
		}, 3000);
	},

	/**
	 * Безпосередньо виконує завантаження даних
	 */
	async performUpload() {
		if (
			!auth.currentUser ||
			this.private.isDownloading ||
			!this.private.hasInitialData
		) {
			if (!this.private.hasInitialData) {
				logService.log(
					"sync",
					"Upload blocked: initial cloud data not yet loaded",
				);
			}
			return;
		}

		// Перевірка на офлайн
		if (!this.private.isOnline) {
			logService.log("sync", "Still offline, aborting upload");
			return;
		}

		this.private.isUploading = true;
		const uid = auth.currentUser.uid;
		const userDocRef = doc(db, COLLECTIONS.USERS, uid);
		const profileRef = doc(db, "profiles", uid);

		try {
			// Отримуємо найсвіжіші дані з хмари перед завантаженням
			const snapshot = await getDoc(userDocRef);
			const cloudData = snapshot.exists() ? snapshot.data() : {};

			const localProgress = progressStore.value;
			const localSettings = settingsStore.value;

			// КРИТИЧНИЙ ЗАХИСТ: якщо в хмарі прогрес більший, ніж локально,
			// ми не повинні робити аплоад, поки не завантажимо ці дані.
			if (
				cloudData.progress &&
				cloudData.progress.totalCorrect > localProgress.totalCorrect
			) {
				logService.warn(
					"sync",
					"Cloud has more progress than local. Forcing download instead of upload.",
				);
				this.handleCloudUpdate(cloudData);
				this.private.isUploading = false;
				return;
			}

			const localData = {
				settings: localSettings,
				progress: localProgress,
				playlists: {
					favorites: playlistStore.favorites,
					extra: playlistStore.extra,
					mistakes: playlistStore.mistakes,
				},
				lastSync: Date.now(),
			};

			const mergedData = this.mergeData(localData, cloudData);

			// Перевіряємо чи є реальні зміни (по порівнянню totalCorrect та lastUpdated)
			if (
				cloudData.progress &&
				cloudData.progress.totalCorrect === localProgress.totalCorrect &&
				cloudData.progress.lastUpdated === localProgress.lastUpdated &&
				cloudData.lastSync > Date.now() - 10000
			) {
				// Якщо була синхронізація менше 10с тому
				logService.log("sync", "No changes to upload, skipping");
				this.private.isUploading = false;
				return;
			}

			// Визначаємо найкраще ім'я для відображення
			const displayName =
				auth.currentUser.displayName ||
				auth.currentUser.email?.split("@")[0] ||
				(auth.currentUser.isAnonymous ? "Гість" : "User");

			// Визначаємо рівень, на якому було досягнуто найкращий стрік правильних відповідей
			let bestCorrectStreakLevel: string | null = null;
			if (localProgress.bestCorrectStreak > 0 && localProgress.levelStats) {
				for (const [lvl, stats] of Object.entries(localProgress.levelStats)) {
					if (
						(stats as any).bestCorrectStreak === localProgress.bestCorrectStreak
					) {
						bestCorrectStreakLevel = lvl;
						break;
					}
				}
			}

			// Одночасне оновлення документа користувача та його публічного профілю
			const profileUpdate: any = {
				displayName: displayName,
				displayNameLower: displayName.toLowerCase(),
				photoURL: auth.currentUser.photoURL || null,
				totalCorrect: localProgress.totalCorrect,
				totalAttempts: localProgress.totalAttempts,
				bestStreak: localProgress.bestStreak,
				bestCorrectStreak: localProgress.bestCorrectStreak,
				bestCorrectStreakLevel: bestCorrectStreakLevel,
				accuracy: Math.round(
					(localProgress.totalCorrect / (localProgress.totalAttempts || 1)) *
						100,
				),
				updatedAt: serverTimestamp(),
			};

			// Додаємо розгорнуту статистику рівнів для фільтрації в лідерборді
			if (localProgress.levelStats) {
				for (const [lvl, stats] of Object.entries(localProgress.levelStats)) {
					const s = stats as any;
					profileUpdate[`level_${lvl}_totalCorrect`] = s.totalCorrect || 0;
					profileUpdate[`level_${lvl}_bestCorrectStreak`] =
						s.bestCorrectStreak || 0;
					profileUpdate[`level_${lvl}_accuracy`] =
						s.totalAttempts > 0
							? Math.round((s.totalCorrect / s.totalAttempts) * 100)
							: 0;
				}
			}

			await Promise.all([
				setDoc(userDocRef, mergedData, { merge: true }),
				// Публікуємо статистику для лідерборду
				setDoc(profileRef, profileUpdate, { merge: true }),
			]);

			this.private.retryCount = 0;
			this.private.lastSyncAttempt = Date.now();

			logService.log("sync", "Upload and profile update successful");
		} catch (e: any) {
			logService.error("sync", "Sync Upload Error:", e);
			// ... (обробка помилок без змін)
			this.scheduleRetry();
		} finally {
			this.private.isUploading = false;
		}
	},

	/**
	 * Обробка даних, що прийшли з хмари
	 */
	handleCloudUpdate(cloudData: any) {
		if (this.private.isUploading) return;

		this.private.isDownloading = true;

		try {
			// Синхронізація налаштувань
			if (cloudData.settings) {
				settingsStore._internalUpdate(cloudData.settings);
			}

			// Синхронізація прогресу
			if (cloudData.progress) {
				const currentProgress = progressStore.value;
				const mergedProgress = {
					...currentProgress,
					...cloudData.progress,
					totalCorrect: Math.max(
						currentProgress.totalCorrect,
						cloudData.progress.totalCorrect || 0,
					),
					totalAttempts: Math.max(
						currentProgress.totalAttempts,
						cloudData.progress.totalAttempts || 0,
					),
					bestStreak: Math.max(
						currentProgress.bestStreak,
						cloudData.progress.bestStreak || 0,
					),
					bestCorrectStreak: Math.max(
						currentProgress.bestCorrectStreak,
						cloudData.progress.bestCorrectStreak || 0,
					),
					// Об'єднуємо об'єкти слів
					words: this.mergeWordProgress(
						currentProgress.words,
						cloudData.progress.words || {},
					),
					// Об'єднуємо статистику по рівнях
					levelStats: this.mergeLevelStats(
						currentProgress.levelStats,
						cloudData.progress.levelStats || {},
					),
				};
				progressStore._internalSet(mergedProgress);
			}

			// Синхронізація плейлістів
			if (cloudData.playlists) {
				playlistStore._internalSet(cloudData.playlists);
			}

			logService.log("sync", "Cloud update processed");
		} catch (e) {
			logService.error("sync", "Sync Download Error:", e);
		} finally {
			this.private.isDownloading = false;
		}
	},

	/**
	 * Розумне об'єднання даних
	 */
	mergeData(local: any, cloud: any) {
		// Якщо хмарні дані новіші за локальні (за часом останньої синхронізації),
		// або локальні дані ніколи не синхронізувалися
		const cloudIsNewer = cloud.lastSync > (local.lastSync || 0);

		return {
			// Налаштування: беремо новіші за часом, або об'єднуємо (хмарні мають пріоритет)
			settings: cloudIsNewer
				? { ...local.settings, ...cloud.settings }
				: { ...cloud.settings, ...local.settings },

			progress: {
				...cloud.progress,
				...local.progress,
				// Для лічильників завжди беремо максимум (прогрес не може зменшуватися)
				totalCorrect: Math.max(
					local.progress.totalCorrect,
					cloud.progress?.totalCorrect || 0,
				),
				totalAttempts: Math.max(
					local.progress.totalAttempts,
					cloud.progress?.totalAttempts || 0,
				),
				bestStreak: Math.max(
					local.progress.bestStreak,
					cloud.progress?.bestStreak || 0,
				),
				bestCorrectStreak: Math.max(
					local.progress.bestCorrectStreak,
					cloud.progress?.bestCorrectStreak || 0,
				),

				// Слова: зливаємо за кількістю правильних відповідей
				words: this.mergeWordProgress(
					local.progress.words,
					cloud.progress?.words || {},
				),

				// Статистика рівнів: зливаємо за максимумом
				levelStats: this.mergeLevelStats(
					local.progress.levelStats,
					cloud.progress?.levelStats || {},
				),

				lastUpdated: Math.max(
					local.progress.lastUpdated,
					cloud.progress?.lastUpdated || 0,
				),
			},

			playlists: {
				favorites: this.mergeArrays(
					local.playlists.favorites,
					cloud.playlists?.favorites || [],
				),
				extra: this.mergeArrays(
					local.playlists.extra,
					cloud.playlists?.extra || [],
				),
				mistakes: this.mergeArrays(
					local.playlists.mistakes,
					cloud.playlists?.mistakes || [],
					"pair.id",
				),
			},

			avatar: local.avatar || cloud.avatar || null,
			lastSync: Date.now(),
		};
	},

	mergeWordProgress(localWords: any, cloudWords: any) {
		const merged = { ...cloudWords };
		for (const [key, val] of Object.entries(localWords)) {
			const localVal = val as any;
			const cloudVal = cloudWords[key];
			if (!cloudVal || localVal.correctCount > cloudVal.correctCount) {
				merged[key] = localVal;
			}
		}
		return merged;
	},

	mergeLevelStats(localStats: any, cloudStats: any) {
		const merged = { ...cloudStats };
		for (const [level, stats] of Object.entries(localStats)) {
			const l = stats as any;
			const c = cloudStats[level];
			if (!c) {
				merged[level] = l;
			} else {
				merged[level] = {
					totalCorrect: Math.max(l.totalCorrect, c.totalCorrect),
					totalAttempts: Math.max(l.totalAttempts, c.totalAttempts),
					bestCorrectStreak: Math.max(l.bestCorrectStreak, c.bestCorrectStreak),
					currentCorrectStreak: 0, // Скидаємо поточний стрік при мержі для безпеки
				};
			}
		}
		return merged;
	},

	mergeArrays(local: any[], cloud: any[], idPath = "id") {
		const getID = (obj: any) => idPath.split(".").reduce((o, i) => o[i], obj);
		const map = new Map();
		cloud.forEach((item) => map.set(getID(item), item));
		local.forEach((item) => map.set(getID(item), item)); // Локальні дані мають пріоритет при конфлікті версій
		return Array.from(map.values());
	},

	/**
	 * Отримати статус синхронізації
	 */
	getStatus() {
		return {
			isOnline: this.private.isOnline,
			isUploading: this.private.isUploading,
			isDownloading: this.private.isDownloading,
			lastSync: this.private.lastSyncAttempt,
			retryCount: this.private.retryCount,
		};
	},
};
