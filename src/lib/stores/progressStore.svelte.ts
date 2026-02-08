/**
 * Progress Store — Відстеження прогресу вивчення слів
 * Зберігає статистику в localStorage
 */

import { browser } from "$app/environment";
import { SyncService } from "../firebase/SyncService.svelte";
import { streakService } from "../services/streakService";
import {
	ProgressStateSchema,
	DailyActivitySchema,
	type ProgressState,
	type LevelStats,
	type WordProgress,
	type DailyActivity,
} from "../data/schemas";

const STORAGE_KEY = "wordApp_progress";
const ACTIVITY_STORAGE_KEY = "wordApp_daily_activity";

/** Значення за замовчуванням */
const DEFAULT_PROGRESS: ProgressState = ProgressStateSchema.parse({});

function createProgressStore() {
	let progress = $state<ProgressState>(loadProgress());
	let dailyActivity = $state<DailyActivity>(loadDailyActivity());

	function getTodayDate(): string {
		return new Date().toLocaleDateString('en-CA');
	}

	function loadProgress(): ProgressState {
		if (!browser) return DEFAULT_PROGRESS;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				return ProgressStateSchema.parse(parsed);
			}
		} catch (e) {
			console.warn("Failed to load progress:", e);
		}
		return DEFAULT_PROGRESS;
	}

	function loadDailyActivity(): DailyActivity {
		if (!browser) return DailyActivitySchema.parse({ date: getTodayDate() });

		try {
			const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				const today = getTodayDate();
				if (parsed.date === today) {
					return DailyActivitySchema.parse(parsed);
				}
			}
		} catch (e) {
			console.warn("Failed to load daily activity:", e);
		}
		return DailyActivitySchema.parse({ date: getTodayDate() });
	}

	let saveTimeout: ReturnType<typeof setTimeout>;

	function saveProgress(): void {
		if (browser) {
			if (saveTimeout) clearTimeout(saveTimeout);
			
			saveTimeout = setTimeout(() => {
				// Garbage Collection: Видаляємо записи про слова, які давно не бачили
				const now = Date.now();
				const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
				
				let hasCleanup = false;
				const cleanedWords = { ...progress.words };
				
				for (const [key, word] of Object.entries(cleanedWords)) {
					if (now - word.lastSeen > MAX_AGE && word.correctCount < 2) {
						delete cleanedWords[key];
						hasCleanup = true;
					}
				}
				
				if (hasCleanup) {
					progress.words = cleanedWords;
				}

				progress.lastUpdated = now;
				localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
				
				dailyActivity.updatedAt = now;
				localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(dailyActivity));
				
				SyncService.uploadAll();
			}, 3000); // 3 секунди дебаунсу для прогресу (економія квот)
		}
	}

	if (browser) {
		window.addEventListener("storage", (e) => {
			if (e.key === STORAGE_KEY && e.newValue) {
				const parsed = JSON.parse(e.newValue);
				const result = ProgressStateSchema.safeParse(parsed);
				if (result.success) {
					progress = result.data;
				}
			}
			if (e.key === ACTIVITY_STORAGE_KEY && e.newValue) {
				const parsed = JSON.parse(e.newValue);
				const result = DailyActivitySchema.safeParse(parsed);
				if (result.success) {
					dailyActivity = result.data;
				}
			}
		});
	}

	return {
		get value() {
			return progress;
		},

		get todayActivity() {
			return dailyActivity;
		},

		/** Internal set for SyncService to avoid infinite loops */
		_internalSet(newData: unknown) {
			try {
				progress = ProgressStateSchema.parse(newData);
				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
				}
			} catch (e: unknown) {
				console.error("Failed to sync progress: invalid data", e);
			}
		},

		/** Internal set for Daily Activity */
		_internalSetActivity(newData: unknown) {
			try {
				dailyActivity = DailyActivitySchema.parse(newData);
				if (browser) {
					localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(dailyActivity));
				}
			} catch (e: unknown) {
				console.error("Failed to sync daily activity: invalid data", e);
			}
		},

		/** Записати правильну відповідь */
		recordCorrect(wordKey: string, levelId: string = "unknown"): void {
			// Update Daily Activity
			const today = getTodayDate();
			if (dailyActivity.date !== today) {
				dailyActivity = DailyActivitySchema.parse({ date: today });
			}
			
			dailyActivity.totalCorrect++;
			dailyActivity.totalAttempts++;
			if (!dailyActivity.levelStats[levelId]) {
				dailyActivity.levelStats[levelId] = { correct: 0, attempts: 0 };
			}
			dailyActivity.levelStats[levelId].correct++;
			dailyActivity.levelStats[levelId].attempts++;

			// Update General Progress
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
				progress.lastStreakUpdateDate,
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
			// Update Daily Activity
			const today = getTodayDate();
			if (dailyActivity.date !== today) {
				dailyActivity = DailyActivitySchema.parse({ date: today });
			}
			dailyActivity.totalAttempts++;
			if (!dailyActivity.levelStats[levelId]) {
				dailyActivity.levelStats[levelId] = { correct: 0, attempts: 0 };
			}
			dailyActivity.levelStats[levelId].attempts++;

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
			dailyActivity = DailyActivitySchema.parse({ date: getTodayDate() });
			if (browser) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
				localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(dailyActivity));
			}
		},
	};
}

export const progressStore = createProgressStore();
