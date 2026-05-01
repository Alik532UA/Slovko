/**
 * Progress Store — Відстеження прогресу вивчення слів
 * Зберігає статистику в localStorage
 */

import { browser } from "$app/environment";
import { SyncService } from "../firebase/SyncService.svelte";
import { streakService } from "../services/streakService";
import { logService } from "../services/logService.svelte";
import { localStorageProvider } from "../services/storage/storageProvider";
import { localEventsStore } from "../stores/localEventsStore.svelte";
import { isMagicGap } from "../utils/gapSequence";
import { leaderboardSyncService } from "../services/leaderboardSyncService";
import { authStore } from "../firebase/authStore.svelte";
import {
	ProgressStateSchema,
	DailyActivitySchema,
	type ProgressState,
	type LevelStats,
	type WordProgress,
	type DailyActivity,
} from "../data/schemas";

const STORAGE_KEY = "progress";
const ACTIVITY_STORAGE_KEY = "daily_activity";

/** Значення за замовчуванням */
const DEFAULT_PROGRESS: ProgressState = ProgressStateSchema.parse({});

function createProgressStore() {
	let progress = $state<ProgressState>(loadProgress());
	let dailyActivity = $state<DailyActivity>(loadDailyActivity());
	let sessionOvertakenUid: string | null = null;

	async function checkLeaderboard(currentTotalCorrect: number) {
		try {
			const leader = await leaderboardSyncService.getLeader();
			const currentUid = authStore.uid;

			if (!leader) return;

			const gap = leader.totalCorrect - currentTotalCorrect;

			// Запобігаємо перевірці з власним рекордом, якщо ми вже лідер
			if (leader.uid === currentUid && gap <= 0) {
				return;
			}

			if (gap > 0) {
				if (isMagicGap(gap) && !progress.shownGaps.includes(gap)) {
					localEventsStore.addLeaderGapReached(gap);
					progress.shownGaps = [...progress.shownGaps, gap];
					saveProgress(); // SSoT: записуємо в пам'ять одразу
				}
			} else if (gap <= 0) {
				// Захищаємо від спаму протягом однієї сесії
				if (sessionOvertakenUid === leader.uid) {
					return;
				}

				const realLeaderScore = await leaderboardSyncService.verifyLeaderScore(leader.uid);
				if (realLeaderScore !== null && currentTotalCorrect > realLeaderScore) {
					localEventsStore.addLeaderOvertaken();
					sessionOvertakenUid = leader.uid;
					leaderboardSyncService.clearCache(); // Скидаємо кеш, щоб отримати наступного
				} else if (realLeaderScore !== null) {
					leaderboardSyncService.clearCache();
				}
			}
		} catch (err) {
			logService.error("debug", "[DEBUG-LEADER] Error in checkLeaderboard", err);
		}
	}

	function getTodayDate(): string {
		return new Date().toLocaleDateString('en-CA');
	}

	function loadProgress(): ProgressState {
		if (!browser) return DEFAULT_PROGRESS;

		try {
			const validated = localStorageProvider.getJson(STORAGE_KEY);
			if (validated) {
				const result = ProgressStateSchema.safeParse(validated);
				if (result.success) {
					// Завжди запускаємо міграцію/корекцію для гарантії SSoT (Single Source of Truth)
					return migrateStatistics(result.data);
				}
			}
		} catch (e) {
			logService.warn("debug", "Failed to load progress:", e);
		}
		return DEFAULT_PROGRESS;
	}

	function migrateStatistics(state: ProgressState): ProgressState {
		// Працюємо з копією даних, щоб не мутувати стан напряму під час обробки
		const newState: ProgressState = JSON.parse(JSON.stringify(state));

		const dirtyKeys = Object.keys(newState.levelStats).filter(
			(k) => k.includes(",") || k === "ALL"
		);

		if (dirtyKeys.length > 0) {
			logService.log("stats", `Starting statistics migration for keys: ${dirtyKeys.join(", ")}`);

			const allAvailableLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];

			for (const key of dirtyKeys) {
				const stats = newState.levelStats[key];
				if (!stats || stats.totalCorrect === 0) {
					delete newState.levelStats[key];
					continue;
				}

				let targetLevels: string[] = [];
				if (key === "ALL") {
					targetLevels = [...allAvailableLevels];
				} else {
					targetLevels = key.split(",").map(s => s.trim()).filter(Boolean);
				}

				if (targetLevels.length === 0) {
					delete newState.levelStats[key];
					continue;
				}

				logService.log("stats", `Migrating "${key}" (${stats.totalCorrect} correct) into [${targetLevels.join(", ")}]`);

				const distributeMetric = (total: number, target: keyof LevelStats) => {
					if (total <= 0) return;
					const count = targetLevels.length;
					const base = Math.floor(total / count);
					const remainder = total % count;

					// Додаємо базові значення
					targetLevels.forEach(lvl => {
						if (!newState.levelStats[lvl]) {
							newState.levelStats[lvl] = {
								totalCorrect: 0,
								totalAttempts: 0,
								bestCorrectStreak: 0,
								currentCorrectStreak: 0,
							};
						}
						(newState.levelStats[lvl][target] as number) += base;
					});

					// Випадково розподіляємо залишок
					const shuffled = [...targetLevels].sort(() => Math.random() - 0.5);
					for (let i = 0; i < remainder; i++) {
						(newState.levelStats[shuffled[i]][target] as number) += 1;
					}
				};

				distributeMetric(stats.totalCorrect, "totalCorrect");
				distributeMetric(stats.totalAttempts, "totalAttempts");

				// Максимальний стрік просто копіюємо
				targetLevels.forEach(lvl => {
					if (newState.levelStats[lvl]) {
						newState.levelStats[lvl].bestCorrectStreak = Math.max(
							newState.levelStats[lvl].bestCorrectStreak,
							stats.bestCorrectStreak || 0
						);
					}
				});

				// ВИДАЛЯЄМО ключ відразу, щоб він не міг бути мігрований знову
				delete newState.levelStats[key];
			}
		}

		// ПЕРЕВІРКА ТА КОРЕКЦІЯ ЦІЛІСНОСТІ (Завжди!)
		// Ми НІКОЛИ не зменшуємо загальний результат користувача.
		// Якщо totalCorrect > sum(levelStats), ми зберігаємо різницю як 'legacy', 
		// щоб сума рівнів завжди збігалася з загальним результатом.
		const currentLevelsSum = Object.values(newState.levelStats).reduce((a, b) => a + (b.totalCorrect || 0), 0);
		const currentAttemptsSum = Object.values(newState.levelStats).reduce((a, b) => a + (b.totalAttempts || 0), 0);

		const baseTotalCorrect = newState.totalCorrect || 0;
		const restored = newState.restoredPoints || 0;

		// Якщо загальний результат більший за суму рівнів (включаючи відновлені)
		if (baseTotalCorrect > (currentLevelsSum + restored)) {
			const diff = baseTotalCorrect - (currentLevelsSum + restored);
			logService.warn("stats", `Found ${diff} orphaned points. Moving to 'legacy' category.`);

			if (!newState.levelStats["legacy"]) {
				newState.levelStats["legacy"] = { totalCorrect: 0, totalAttempts: 0, bestCorrectStreak: 0, currentCorrectStreak: 0 };
			}
			newState.levelStats["legacy"].totalCorrect += diff;
			// attempts теж коригуємо пропорційно або просто додаємо різницю
			const attemptsDiff = Math.max(0, (newState.totalAttempts || 0) - currentAttemptsSum);
			newState.levelStats["legacy"].totalAttempts += attemptsDiff;
		}

		// Тепер гарантуємо, що totalCorrect не менший за суму (Integrity Protection)
		const finalCorrectSum = Object.values(newState.levelStats).reduce((a, b) => a + (b.totalCorrect || 0), 0);
		const finalAttemptsSum = Object.values(newState.levelStats).reduce((a, b) => a + (b.totalAttempts || 0), 0);

		newState.totalCorrect = finalCorrectSum + (newState.restoredPoints || 0);
		newState.totalAttempts = finalAttemptsSum;

		return newState;
	}

	function loadDailyActivity(): DailyActivity {
		if (!browser) return DailyActivitySchema.parse({ date: getTodayDate() });

		try {
			const validated = localStorageProvider.getJson(ACTIVITY_STORAGE_KEY) as any;
			if (validated) {
				const today = getTodayDate();
				if (validated.date === today) {
					return DailyActivitySchema.parse(validated);
				}
			}
		} catch (e) {
			logService.warn("debug", "Failed to load daily activity:", e);
		}
		return DailyActivitySchema.parse({ date: getTodayDate() });
	}

	let saveTimeout: ReturnType<typeof setTimeout>;

	function saveProgress(): void {
		if (browser) {
			// 1. Оновлюємо localStorage миттєво (SSoT для поточної сесії та UI)
			progress.lastUpdated = Date.now();
			localStorageProvider.setJson(STORAGE_KEY, progress);
			localStorageProvider.setJson(ACTIVITY_STORAGE_KEY, dailyActivity);

			// 2. Дебаунсимо тільки завантаження в хмару та важкі операції очищення
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
					localStorageProvider.setJson(STORAGE_KEY, progress);
				}

				SyncService.uploadAll();
			}, 2000); // 2 секунди дебаунсу для хмари
		}
	}

	if (browser) {
		window.addEventListener("storage", (e) => {
			if (e.key === "slovko_" + STORAGE_KEY && e.newValue) {
				const parsed = JSON.parse(e.newValue);
				const result = ProgressStateSchema.safeParse(parsed);
				if (result.success) {
					progress = result.data;
				}
			}
			if (e.key === "slovko_" + ACTIVITY_STORAGE_KEY && e.newValue) {
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
				const validated = ProgressStateSchema.parse(newData);
				progress = migrateStatistics(validated);

				if (browser) {
					localStorageProvider.setJson(STORAGE_KEY, progress);
				}
			} catch (e: unknown) {
				logService.error("debug", "Failed to sync progress: invalid data", e);
			}
		},

		/** Internal set for Daily Activity */
		_internalSetActivity(newData: unknown) {
			try {
				dailyActivity = DailyActivitySchema.parse(newData);
				if (browser) {
					localStorageProvider.setJson(ACTIVITY_STORAGE_KEY, dailyActivity);
				}
			} catch (e: unknown) {
				logService.error("debug", "Failed to sync daily activity: invalid data", e);
			}
		},

		/** Записати правильну відповідь */
		recordCorrect(wordKey: string, levelId: string = "unknown"): void {
			logService.log("debug", "[DEBUG-LEADER] recordCorrect called", { wordKey, levelId });
			try {
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
				const oldStreakUpdateDate = progress.lastStreakUpdateDate;
				const streakUpdate = streakService.calculateStreak(
					progress.streak,
					progress.lastCorrectDate,
					progress.dailyCorrect,
					progress.lastStreakUpdateDate,
				);

				// Перевірка досягнення цілі (10 пар)
				if (streakUpdate.lastStreakUpdateDate === today && oldStreakUpdateDate !== today) {
					logService.log("stats", "Daily goal reached! State updated.");
					localEventsStore.addAchievement(streakUpdate.streak);
				}

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

				// Логіка гонитви за лідером
				const now = Date.now();
				const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 година
				let updatedShownGaps = [...(progress.shownGaps || [])];

				// Якщо пройшло більше години з останньої активності — скидаємо список показаних сповіщень
				if (now - (progress.lastInteractionTimestamp || 0) > SESSION_TIMEOUT) {
					updatedShownGaps = [];
				}

				const currentTotalCorrect = progress.totalCorrect + 1;
				checkLeaderboard(currentTotalCorrect).catch((e) => logService.error("debug", "Promise rejection:", e));

				// Логіка по рівнях
				const currentLevelStats = progress.levelStats[levelId] || {
					totalCorrect: 0,
					totalAttempts: 0,
					bestCorrectStreak: 0,
					currentCorrectStreak: 0,
				};

				const lvlStreak = currentLevelStats.currentCorrectStreak + 1;
				const lvlBest = Math.max(currentLevelStats.bestCorrectStreak, lvlStreak);

				// Підрахунок загальної кількості активних днів (activeDaysCount)
				// Ми інкрементуємо лише один раз на добу при першій правильній відповіді
				let newActiveDaysCount = progress.activeDaysCount || 0;
				if (progress.lastCorrectDate !== today) {      
					newActiveDaysCount++;
				}

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
					activeDaysCount: newActiveDaysCount,   
					shownGaps: updatedShownGaps,
					lastInteractionTimestamp: now,
					...streakUpdate,
				};

				logService.log("stats", `Progress Store updated`, {
					totalCorrect: progress.totalCorrect,   
					streak: progress.streak,
					activeDaysCount: progress.activeDaysCount,
					bestStreak: progress.bestStreak,       
					dailyCorrect: progress.dailyCorrect,   
					lastStreakUpdateDate: progress.lastStreakUpdateDate
				});

				saveProgress();
			} catch (e) {
				logService.error("debug", "[DEBUG-LEADER] CRITICAL ERROR in recordCorrect", e);
			}
		},

		/** Отримати середню кількість правильних відповідей за день */
		getDailyAverage(): number {
			const days = Math.max(1, progress.activeDaysCount || 1);
			const avg = progress.totalCorrect / days;
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
				localStorageProvider.setJson(STORAGE_KEY, progress);
				localStorageProvider.setJson(ACTIVITY_STORAGE_KEY, dailyActivity);
			}
		},
	};
}

export const progressStore = createProgressStore();
