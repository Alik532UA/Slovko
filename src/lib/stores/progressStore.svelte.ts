/**
 * Progress Store — Відстеження прогресу вивчення слів
 * Зберігає статистику в localStorage
 */

import { browser } from '$app/environment';

const STORAGE_KEY = 'wordApp_progress';

/** Прогрес для одного слова */
interface WordProgress {
    wordKey: string;
    correctCount: number;
    lastSeen: number; // timestamp
}

/** Загальний прогрес користувача */
interface UserProgress {
    words: Record<string, WordProgress>;
    totalCorrect: number;
    totalAttempts: number;
    lastUpdated: number;
}

/** Значення за замовчуванням */
const DEFAULT_PROGRESS: UserProgress = {
    words: {},
    totalCorrect: 0,
    totalAttempts: 0,
    lastUpdated: Date.now()
};

function createProgressStore() {
    let progress = $state<UserProgress>(loadProgress());

    function loadProgress(): UserProgress {
        if (!browser) return DEFAULT_PROGRESS;

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return { ...DEFAULT_PROGRESS, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.warn('Failed to load progress:', e);
        }
        return DEFAULT_PROGRESS;
    }

    function saveProgress(): void {
        if (browser) {
            progress.lastUpdated = Date.now();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        }
    }

    return {
        get value() {
            return progress;
        },

        /** Записати правильну відповідь */
        recordCorrect(wordKey: string): void {
            const wordProgress = progress.words[wordKey] || {
                wordKey,
                correctCount: 0,
                lastSeen: 0
            };

            wordProgress.correctCount++;
            wordProgress.lastSeen = Date.now();
            progress.words[wordKey] = wordProgress;


            progress = {
                ...progress,
                words: { ...progress.words },
                totalCorrect: progress.totalCorrect + 1,
                totalAttempts: progress.totalAttempts + 1
            };

            saveProgress();
        },

        /** Записати неправильну відповідь */
        recordWrong(): void {
            progress = {
                ...progress,
                totalAttempts: progress.totalAttempts + 1
            };
            saveProgress();
        },

        /** Отримати кількість вивчених слів (3+ правильних відповідей) */
        getLearnedCount(): number {
            return Object.values(progress.words).filter((w) => w.correctCount >= 3).length;
        },

        /** Отримати відсоток правильних відповідей */
        getAccuracy(): number {
            if (progress.totalAttempts === 0) return 0;
            return Math.round((progress.totalCorrect / progress.totalAttempts) * 100);
        },

        /** Перевірити чи слово вивчене */
        isWordLearned(wordKey: string): boolean {
            const w = progress.words[wordKey];
            return w ? w.correctCount >= 3 : false;
        },

        /** Скинути прогрес */
        reset(): void {
            progress = { ...DEFAULT_PROGRESS };
            saveProgress();
        }
    };
}

export const progressStore = createProgressStore();
