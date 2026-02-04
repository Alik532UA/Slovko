/**
 * Progress Store — Відстеження прогресу вивчення слів
 * Зберігає статистику в localStorage
 */

import { browser } from "$app/environment";
import { SyncService } from "../firebase/SyncService";
import { streakService } from "../services/streakService";
import {
	ProgressStateSchema,
	type ProgressState,
	type LevelStats,
	type WordProgress,
} from "../data/schemas";

const STORAGE_KEY = "wordApp_progress";

/** Значення за замовчуванням */
const DEFAULT_PROGRESS: ProgressState = ProgressStateSchema.parse({});

function createProgressStore() {
	let progress = $state<ProgressState>(loadProgress());

	function loadProgress(): ProgressState {
		if (!browser) return DEFAULT_PROGRESS;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				// Use Zod to validate and fill defaults
				return ProgressStateSchema.parse(parsed);
			}
		} catch (e) {
			console.warn("Failed to load progress:", e);
		}
		return DEFAULT_PROGRESS;
	}

	function saveProgress(): void {
		if (browser) {
			progress.lastUpdated = Date.now();
			localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
			SyncService.uploadAll();
		}
	}

	return {
		get value() {
			return progress;
		},

		/** Internal set for SyncService to avoid infinite loops */
		_internalSet(newData: any) {
			try {
				progress = ProgressStateSchema.parse(newData);
				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
				}
			} catch (e) {
				console.error("Failed to sync progress: invalid data", e);
			}
		},

		/** Записати правильну відповідь */
		recordCorrect(wordKey: string, levelId: string = "unknown"): void {
			const wordProgress: WordProgress = progress.words[wordKey] || {
				wordKey,
				correctCount: 0,
				lastSeen: 0,
			};

			wordProgress.correctCount++;
			wordProgress.lastSeen = Date.now();
			progress.words[wordKey] = wordProgress;

			// Логіка Streak (днів)
			const streakUpdate = streakService.calculateStreak(
				progress.streak,
				progress.lastCorrectDate,
				progress.dailyCorrect,
			);

			// Логіка серії правильних відповідей (підряд) - Глобальна
			const newCurrentCorrectStreak = progress.currentCorrectStreak + 1;
			const newBestCorrectStreak = Math.max(
				progress.bestCorrectStreak,
				newCurrentCorrectStreak,
			);
			const newBestDaysStreak = Math.max(
				progress.bestStreak,
				streakUpdate.streak,
			);

			// Логіка по рівнях
			const currentLevelStats = progress.levelStats[levelId] || {
				totalCorrect: 0,
				totalAttempts: 0,
				bestCorrectStreak: 0,
				currentCorrectStreak: 0,
			};

			const lvlStreak = currentLevelStats.currentCorrectStreak + 1;
			const lvlBest = Math.max(currentLevelStats.bestCorrectStreak, lvlStreak);

			const newLevelStats = {
				...progress.levelStats,
				[levelId]: {
					totalCorrect: currentLevelStats.totalCorrect + 1,
					totalAttempts: currentLevelStats.totalAttempts + 1,
					currentCorrectStreak: lvlStreak,
					bestCorrectStreak: lvlBest,
				},
			};

			progress = {
				...progress,
				words: { ...progress.words },
				levelStats: newLevelStats,
				totalCorrect: progress.totalCorrect + 1,
				totalAttempts: progress.totalAttempts + 1,
				bestStreak: newBestDaysStreak,
				currentCorrectStreak: newCurrentCorrectStreak,
				bestCorrectStreak: newBestCorrectStreak,
				...streakUpdate,
			};

			saveProgress();
		},

		/** Отримати середню кількість правильних відповідей за день */
		getDailyAverage(): number {
			const daysInApp = Math.max(
				1,
				Math.ceil(
					(Date.now() - progress.firstSeenDate) / (1000 * 60 * 60 * 24),
				),
			);
			const avg = progress.totalCorrect / daysInApp;
			return Math.round(avg * 10) / 10; // Повертаємо з одним знаком після коми
		},

		/** Записати неправильну відповідь */
		recordWrong(levelId: string = "unknown"): void {
			// Логіка по рівнях
			const currentLevelStats = progress.levelStats[levelId] || {
				totalCorrect: 0,
				totalAttempts: 0,
				bestCorrectStreak: 0,
				currentCorrectStreak: 0,
			};

			const newLevelStats = {
				...progress.levelStats,
				[levelId]: {
					...currentLevelStats,
					totalAttempts: currentLevelStats.totalAttempts + 1,
					currentCorrectStreak: 0, // Reset level streak
				},
			};

			progress = {
				...progress,
				levelStats: newLevelStats,
				totalAttempts: progress.totalAttempts + 1,
				currentCorrectStreak: 0, // Перериваємо серію при помилці
			};
			saveProgress();
		},

		/** Отримати статистику рівня */
		getLevelStats(levelId: string): LevelStats {
			return (
				progress.levelStats[levelId] || {
					totalCorrect: 0,
					totalAttempts: 0,
					bestCorrectStreak: 0,
					currentCorrectStreak: 0,
				}
			);
		},

		/** Отримати кількість вивчених слів (3+ правильних відповідей) */
		getLearnedCount(): number {
			return Object.values(progress.words).filter((w) => w.correctCount >= 3)
				.length;
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

		/** Скинути прогрес (тільки локально) */
		reset(): void {
			progress = { ...DEFAULT_PROGRESS, firstSeenDate: Date.now() };
			if (browser) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
			}
		},
	};
}

export const progressStore = createProgressStore();
