import { doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import { db, auth } from "./config";
import { settingsStore } from "../stores/settingsStore.svelte";
import { progressStore } from "../stores/progressStore.svelte";
import { playlistStore } from "../stores/playlistStore.svelte";
import { logService } from "../services/logService";
import { notificationStore } from "../stores/notificationStore.svelte";

const COLLECTIONS = {
    USERS: "users",
    DATA: "userData"
};

/** Retry configuration */
const RETRY_CONFIG = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000
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
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        lastSyncAttempt: 0,
        offlineNotificationShown: false
    },

    /**
     * Ініціалізація синхронізації для конкретного користувача
     */
    init(uid: string) {
        if (this.private.unsubscribe) this.private.unsubscribe();

        // Слухаємо зміни в документі користувача
        const userDocRef = doc(db, COLLECTIONS.USERS, uid);

        // Відстежуємо стан мережі
        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.handleOnline.bind(this));
            window.addEventListener('offline', this.handleOffline.bind(this));
            this.private.isOnline = navigator.onLine;
        }

        this.private.unsubscribe = onSnapshot(userDocRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const cloudData = snapshot.data();
                    this.handleCloudUpdate(cloudData);
                }
            },
            (error) => {
                logService.warn('sync', 'Snapshot listener error:', error);
                // При помилці спробуємо перепідключитись
                if (this.private.isOnline) {
                    this.scheduleRetry();
                }
            }
        );

        logService.log('sync', `Sync initialized for user: ${uid}`);
    },

    /**
     * Обробка переходу в онлайн
     */
    handleOnline() {
        logService.log('sync', 'Network: online');
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
        logService.log('sync', 'Network: offline');
        this.private.isOnline = false;
    },

    /**
     * Планування повторної спроби з експоненційним відступом
     */
    scheduleRetry() {
        if (this.private.retryCount >= RETRY_CONFIG.maxAttempts) {
            logService.warn('sync', 'Max retry attempts reached');
            return;
        }

        const delay = Math.min(
            RETRY_CONFIG.baseDelay * Math.pow(2, this.private.retryCount),
            RETRY_CONFIG.maxDelay
        );

        this.private.retryCount++;
        logService.log('sync', `Scheduling retry #${this.private.retryCount} in ${delay}ms`);

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
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleOnline.bind(this));
            window.removeEventListener('offline', this.handleOffline.bind(this));
        }

        // Скидаємо стан
        this.private.retryCount = 0;
        this.private.offlineNotificationShown = false;

        logService.log('sync', 'Sync stopped');
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
            logService.log('sync', 'Offline, skipping upload');
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
        if (!auth.currentUser || this.private.isDownloading) return;

        // Перевірка на офлайн
        if (!this.private.isOnline) {
            logService.log('sync', 'Still offline, aborting upload');
            return;
        }

        this.private.isUploading = true;
        const uid = auth.currentUser.uid;
        const userDocRef = doc(db, COLLECTIONS.USERS, uid);

        try {
            const snapshot = await getDoc(userDocRef);
            const cloudData = snapshot.exists() ? snapshot.data() : {};

            // Parse avatar hack for graceful enhancement
            let avatarData = null;
            if (auth.currentUser.photoURL?.startsWith("internal:")) {
                const parts = auth.currentUser.photoURL.split(":");
                if (parts.length >= 3) {
                    avatarData = { icon: parts[1], color: parts[2] };
                }
            }

            const localData = {
                settings: settingsStore.value,
                progress: progressStore.value,
                playlists: {
                    favorites: playlistStore.favorites,
                    extra: playlistStore.extra,
                    mistakes: playlistStore.mistakes
                },
                avatar: avatarData,
                lastSync: Date.now()
            };

            const mergedData = this.mergeData(localData, cloudData);

            await setDoc(userDocRef, mergedData, { merge: true });

            // Успішна синхронізація — скидаємо лічильник спроб
            this.private.retryCount = 0;
            this.private.lastSyncAttempt = Date.now();

            logService.log('sync', 'Upload successful');
        } catch (e: any) {
            logService.error('sync', 'Sync Upload Error:', e);

            if (e?.code === 'permission-denied') {
                notificationStore.error("Помилка доступу до бази даних. Перевірте правила.");
            } else if (e?.code === 'unavailable' || e?.message?.includes('offline') || !this.private.isOnline) {
                // Показуємо повідомлення про офлайн тільки раз за сесію
                if (!this.private.offlineNotificationShown) {
                    logService.log('sync', 'Network unavailable, data saved locally');
                    this.private.offlineNotificationShown = true;
                }
            } else {
                // Для інших помилок — retry
                this.scheduleRetry();
            }
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

            // Синхронізація прогресу (вибираємо максимальні значення)
            if (cloudData.progress) {
                const currentProgress = progressStore.value;
                const mergedProgress = {
                    ...currentProgress,
                    ...cloudData.progress,
                    totalCorrect: Math.max(currentProgress.totalCorrect, cloudData.progress.totalCorrect || 0),
                    totalAttempts: Math.max(currentProgress.totalAttempts, cloudData.progress.totalAttempts || 0),
                    // Об'єднуємо об'єкти слів, де correctCount вищий
                    words: this.mergeWordProgress(currentProgress.words, cloudData.progress.words || {})
                };
                // progressStore має мати метод для повного оновлення
                (progressStore as any)._internalSet(mergedProgress);
            }

            // Синхронізація плейлістів (Merge за унікальним ID)
            if (cloudData.playlists) {
                // playlistStore має мати метод для повного оновлення
                (playlistStore as any)._internalSet(cloudData.playlists);
            }

            logService.log('sync', 'Cloud update processed');
        } catch (e) {
            logService.error('sync', 'Sync Download Error:', e);
        } finally {
            this.private.isDownloading = false;
        }
    },

    /**
     * Розумне об'єднання даних
     */
    mergeData(local: any, cloud: any) {
        return {
            settings: { ...cloud.settings, ...local.settings },
            progress: {
                ...cloud.progress,
                ...local.progress,
                totalCorrect: Math.max(local.progress.totalCorrect, cloud.progress?.totalCorrect || 0),
                totalAttempts: Math.max(local.progress.totalAttempts, cloud.progress?.totalAttempts || 0),
                words: this.mergeWordProgress(local.progress.words, cloud.progress?.words || {})
            },
            playlists: {
                favorites: this.mergeArrays(local.playlists.favorites, cloud.playlists?.favorites || []),
                extra: this.mergeArrays(local.playlists.extra, cloud.playlists?.extra || []),
                mistakes: this.mergeArrays(local.playlists.mistakes, cloud.playlists?.mistakes || [], 'pair.id')
            },
            avatar: local.avatar,
            lastSync: local.lastSync
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

    mergeArrays(local: any[], cloud: any[], idPath = 'id') {
        const getID = (obj: any) => idPath.split('.').reduce((o, i) => o[i], obj);
        const map = new Map();
        cloud.forEach(item => map.set(getID(item), item));
        local.forEach(item => map.set(getID(item), item)); // Локальні дані мають пріоритет при конфлікті версій
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
            retryCount: this.private.retryCount
        };
    }
};
