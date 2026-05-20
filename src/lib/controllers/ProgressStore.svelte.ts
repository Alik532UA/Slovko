/**
 * ProgressStore — Відстеження прогресу вивчення слів
 */

import { browser } from "$app/environment";
import { SyncService } from "../services/firebase/SyncService.svelte";
import { streakService } from "../services/streakService";
import { logService } from "../services/logService.svelte";
import { localStorageProvider } from "../services/storage/storageProvider";
import { localEventsStore } from "./LocalEventsStore.svelte";
import { isMagicGap } from "../utils/gapSequence";
import { leaderboardSyncService } from "../services/leaderboardSyncService";
import { authStore } from "./AuthStore.svelte";
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

const DEFAULT_PROGRESS: ProgressState = ProgressStateSchema.parse({});

class ProgressStoreClass {
	private _progress = $state<ProgressState>(this.loadProgress());
	private _dailyActivity = $state<DailyActivity>(this.loadDailyActivity());
	private sessionOvertakenUid: string | null = null;
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor() {
		if (browser) {
			window.addEventListener("storage", (e) => {
				if (e.key === "slovko_" + STORAGE_KEY && e.newValue) {
					const parsed = JSON.parse(e.newValue);
					const result = ProgressStateSchema.safeParse(parsed);
					if (result.success) {
						this._progress = result.data;
					}
				}
				if (e.key === "slovko_" + ACTIVITY_STORAGE_KEY && e.newValue) {
					const parsed = JSON.parse(e.newValue);
					const result = DailyActivitySchema.safeParse(parsed);
					if (result.success) {
						this._dailyActivity = result.data;
					}
				}
			});
		}
	}

	get value() { return this._progress; }
	get todayActivity() { return this._dailyActivity; }

	_internalSet(newData: unknown) {
		try {
			const validated = ProgressStateSchema.parse(newData);
			this._progress = this.migrateStatistics(validated);
			if (browser) {
				localStorageProvider.setJson(STORAGE_KEY, this._progress);
			}
		} catch (e: unknown) {
			logService.error("debug", "Failed to sync progress: invalid data", e);
		}
	}

	_internalSetActivity(newData: unknown) {
		try {
			this._dailyActivity = DailyActivitySchema.parse(newData);
			if (browser) {
				localStorageProvider.setJson(ACTIVITY_STORAGE_KEY, this._dailyActivity);
			}
		} catch (e: unknown) {
			logService.error("debug", "Failed to sync daily activity: invalid data", e);
		}
	}

	recordCorrect(wordKey: string, levelId: string = "unknown"): void {
		logService.log("debug", "[DEBUG-LEADER] recordCorrect called", { wordKey, levelId });
		try {
			const today = this.getTodayDate();
			if (this._dailyActivity.date !== today) {
				this._dailyActivity = DailyActivitySchema.parse({ date: today });
			}

			this._dailyActivity.totalCorrect++;
			this._dailyActivity.totalAttempts++;
			if (!this._dailyActivity.levelStats[levelId]) {
				this._dailyActivity.levelStats[levelId] = { correct: 0, attempts: 0 };
			}
			this._dailyActivity.levelStats[levelId].correct++;
			this._dailyActivity.levelStats[levelId].attempts++;

			const wordProgress: WordProgress = this._progress.words[wordKey] || {
				wordKey,
				correctCount: 0,
				lastSeen: 0,
			};

			wordProgress.correctCount++;
			wordProgress.lastSeen = Date.now();
			this._progress.words[wordKey] = wordProgress;

			const oldStreakUpdateDate = this._progress.lastStreakUpdateDate;
			const streakUpdate = streakService.calculateStreak(
				this._progress.streak,
				this._progress.lastCorrectDate,
				this._progress.dailyCorrect,
				this._progress.lastStreakUpdateDate,
			);

			if (streakUpdate.lastStreakUpdateDate === today && oldStreakUpdateDate !== today) {
				logService.log("stats", "Daily goal reached! State updated.");
				localEventsStore.addAchievement(streakUpdate.streak);
			}

			const newCurrentCorrectStreak = this._progress.currentCorrectStreak + 1;
			const newBestCorrectStreak = Math.max(this._progress.bestCorrectStreak, newCurrentCorrectStreak);
			const newBestDaysStreak = Math.max(this._progress.bestStreak, streakUpdate.streak);

			const now = Date.now();
			const SESSION_TIMEOUT = 60 * 60 * 1000;
			let updatedShownGaps = [...(this._progress.shownGaps || [])];

			if (now - (this._progress.lastInteractionTimestamp || 0) > SESSION_TIMEOUT) {
				updatedShownGaps = [];
			}

			const currentTotalCorrect = this._progress.totalCorrect + 1;
			this.checkLeaderboard(currentTotalCorrect).catch((e) => logService.error("debug", "Promise rejection:", e));

			const currentLevelStats = this._progress.levelStats[levelId] || {
				totalCorrect: 0,
				totalAttempts: 0,
				bestCorrectStreak: 0,
				currentCorrectStreak: 0,
			};

			const lvlStreak = currentLevelStats.currentCorrectStreak + 1;
			const lvlBest = Math.max(currentLevelStats.bestCorrectStreak, lvlStreak);

			let newActiveDaysCount = this._progress.activeDaysCount || 0;
			if (this._progress.lastCorrectDate !== today) {      
				newActiveDaysCount++;
			}

			const newLevelStats = {
				...this._progress.levelStats,
				[levelId]: {
					totalCorrect: currentLevelStats.totalCorrect + 1,
					totalAttempts: currentLevelStats.totalAttempts + 1,
					currentCorrectStreak: lvlStreak,
					bestCorrectStreak: lvlBest,
				},
			};

			this._progress = {
				...this._progress,
				words: { ...this._progress.words },
				levelStats: newLevelStats,
				totalCorrect: this._progress.totalCorrect + 1,
				totalAttempts: this._progress.totalAttempts + 1,
				bestStreak: newBestDaysStreak,
				currentCorrectStreak: newCurrentCorrectStreak,
				bestCorrectStreak: newBestCorrectStreak,
				activeDaysCount: newActiveDaysCount,   
				shownGaps: updatedShownGaps,
				lastInteractionTimestamp: now,
				...streakUpdate,
			};

			this.saveProgress();
		} catch (e) {
			logService.error("debug", "[DEBUG-LEADER] CRITICAL ERROR in recordCorrect", e);
		}
	}

	recordWrong(levelId: string = "unknown"): void {
		const today = this.getTodayDate();
		if (this._dailyActivity.date !== today) {
			this._dailyActivity = DailyActivitySchema.parse({ date: today });
		}
		this._dailyActivity.totalAttempts++;
		if (!this._dailyActivity.levelStats[levelId]) {
			this._dailyActivity.levelStats[levelId] = { correct: 0, attempts: 0 };
		}
		this._dailyActivity.levelStats[levelId].attempts++;

		const currentLevelStats = this._progress.levelStats[levelId] || {
			totalCorrect: 0,
			totalAttempts: 0,
			bestCorrectStreak: 0,
			currentCorrectStreak: 0,
		};

		const newLevelStats = {
			...this._progress.levelStats,
			[levelId]: {
				...currentLevelStats,
				totalAttempts: currentLevelStats.totalAttempts + 1,
				currentCorrectStreak: 0,
			},
		};

		this._progress = {
			...this._progress,
			levelStats: newLevelStats,
			totalAttempts: this._progress.totalAttempts + 1,
			currentCorrectStreak: 0,
		};
		this.saveProgress();
	}

	getDailyAverage(): number {
		const days = Math.max(1, this._progress.activeDaysCount || 1);
		const avg = this._progress.totalCorrect / days;
		return Math.round(avg * 10) / 10;
	}

	getLevelStats(levelId: string): LevelStats {
		return (
			this._progress.levelStats[levelId] || {
				totalCorrect: 0,
				totalAttempts: 0,
				bestCorrectStreak: 0,
				currentCorrectStreak: 0,
			}
		);
	}

	getLearnedCount(): number {
		return Object.values(this._progress.words).filter((w) => w.correctCount >= 3).length;
	}

	getAccuracy(): number {
		if (this._progress.totalAttempts === 0) return 0;
		return Math.round((this._progress.totalCorrect / this._progress.totalAttempts) * 100);
	}

	isWordLearned(wordKey: string): boolean {
		const w = this._progress.words[wordKey];
		return w ? w.correctCount >= 3 : false;
	}

	reset(): void {
		this._progress = { ...DEFAULT_PROGRESS, firstSeenDate: Date.now() };
		this._dailyActivity = DailyActivitySchema.parse({ date: this.getTodayDate() });
		if (browser) {
			localStorageProvider.setJson(STORAGE_KEY, this._progress);
			localStorageProvider.setJson(ACTIVITY_STORAGE_KEY, this._dailyActivity);
		}
	}

	private async checkLeaderboard(currentTotalCorrect: number) {
		try {
			const leader = await leaderboardSyncService.getLeader();
			const currentUid = authStore.uid;
			if (!leader) return;
			const gap = leader.totalCorrect - currentTotalCorrect;

			if (leader.uid === currentUid && gap <= 0) return;

			if (gap > 0) {
				if (isMagicGap(gap) && !this._progress.shownGaps.includes(gap)) {
					localEventsStore.addLeaderGapReached(gap);
					this._progress.shownGaps = [...this._progress.shownGaps, gap];
					this.saveProgress();
				}
			} else {
				if (this.sessionOvertakenUid === leader.uid) return;
				const realLeaderScore = await leaderboardSyncService.verifyLeaderScore(leader.uid);
				if (realLeaderScore !== null && currentTotalCorrect > realLeaderScore) {
					localEventsStore.addLeaderOvertaken();
					this.sessionOvertakenUid = leader.uid;
					leaderboardSyncService.clearCache();
				} else if (realLeaderScore !== null) {
					leaderboardSyncService.clearCache();
				}
			}
		} catch (err) {
			logService.error("debug", "[DEBUG-LEADER] Error in checkLeaderboard", err);
		}
	}

	private getTodayDate(): string { return new Date().toLocaleDateString('en-CA'); }

	private loadProgress(): ProgressState {
		if (!browser) return DEFAULT_PROGRESS;
		try {
			const validated = localStorageProvider.getJson(STORAGE_KEY);
			if (validated) {
				const result = ProgressStateSchema.safeParse(validated);
				if (result.success) return this.migrateStatistics(result.data);
			}
		} catch (e) {
			logService.warn("debug", "Failed to load progress:", e);
		}
		return DEFAULT_PROGRESS;
	}

	private loadDailyActivity(): DailyActivity {
		if (!browser) return DailyActivitySchema.parse({ date: this.getTodayDate() });
		try {
			const raw = localStorageProvider.getJson(ACTIVITY_STORAGE_KEY);
			const result = DailyActivitySchema.safeParse(raw);
			if (result.success) {
				if (result.data.date === this.getTodayDate()) return result.data;
			}
		} catch (e) {
			logService.warn("debug", "Failed to load daily activity:", e);
		}
		return DailyActivitySchema.parse({ date: this.getTodayDate() });
	}

	private saveProgress(): void {
		if (browser) {
			this._progress.lastUpdated = Date.now();
			localStorageProvider.setJson(STORAGE_KEY, this._progress);
			localStorageProvider.setJson(ACTIVITY_STORAGE_KEY, this._dailyActivity);

			if (this.saveTimeout) clearTimeout(this.saveTimeout);
			this.saveTimeout = setTimeout(() => {
				this.cleanupOldWords();
				SyncService.uploadAll();
			}, 2000);
		}
	}

	private cleanupOldWords() {
		const now = Date.now();
		const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
		let hasCleanup = false;
		const cleanedWords = { ...this._progress.words };

		for (const [key, word] of Object.entries(cleanedWords)) {
			if (now - word.lastSeen > MAX_AGE && word.correctCount < 2) {
				delete cleanedWords[key];
				hasCleanup = true;
			}
		}

		if (hasCleanup) {
			this._progress.words = cleanedWords;
			localStorageProvider.setJson(STORAGE_KEY, this._progress);
		}
	}

	private migrateStatistics(state: ProgressState): ProgressState {
		const newState: ProgressState = JSON.parse(JSON.stringify(state));
		const dirtyKeys = Object.keys(newState.levelStats).filter(k => k.includes(",") || k === "ALL");

		if (dirtyKeys.length > 0) {
			const allAvailableLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
			for (const key of dirtyKeys) {
				const stats = newState.levelStats[key];
				if (!stats || stats.totalCorrect === 0) {
					delete newState.levelStats[key];
					continue;
				}
				const targetLevels = key === "ALL" ? [...allAvailableLevels] : key.split(",").map(s => s.trim()).filter(Boolean);
				if (targetLevels.length === 0) {
					delete newState.levelStats[key];
					continue;
				}

				const distributeMetric = (total: number, target: keyof LevelStats) => {
					if (total <= 0) return;
					const count = targetLevels.length;
					const base = Math.floor(total / count);
					const remainder = total % count;
					targetLevels.forEach(lvl => {
						if (!newState.levelStats[lvl]) {
							newState.levelStats[lvl] = { totalCorrect: 0, totalAttempts: 0, bestCorrectStreak: 0, currentCorrectStreak: 0 };
						}
						(newState.levelStats[lvl][target] as number) += base;
					});
					const shuffled = [...targetLevels].sort(() => Math.random() - 0.5);
					for (let i = 0; i < remainder; i++) { (newState.levelStats[shuffled[i]][target] as number) += 1; }
				};

				distributeMetric(stats.totalCorrect, "totalCorrect");
				distributeMetric(stats.totalAttempts, "totalAttempts");
				targetLevels.forEach(lvl => {
					if (newState.levelStats[lvl]) {
						newState.levelStats[lvl].bestCorrectStreak = Math.max(newState.levelStats[lvl].bestCorrectStreak, stats.bestCorrectStreak || 0);
					}
				});
				delete newState.levelStats[key];
			}
		}

		const currentLevelsSum = Object.values(newState.levelStats).reduce((a, b) => a + (b.totalCorrect || 0), 0);
		const baseTotalCorrect = newState.totalCorrect || 0;
		const restored = newState.restoredPoints || 0;

		if (baseTotalCorrect > (currentLevelsSum + restored)) {
			const diff = baseTotalCorrect - (currentLevelsSum + restored);
			if (!newState.levelStats["legacy"]) {
				newState.levelStats["legacy"] = { totalCorrect: 0, totalAttempts: 0, bestCorrectStreak: 0, currentCorrectStreak: 0 };
			}
			newState.levelStats["legacy"].totalCorrect += diff;
			const attemptsDiff = Math.max(0, (newState.totalAttempts || 0) - Object.values(newState.levelStats).reduce((a, b) => a + (b.totalAttempts || 0), 0) + (newState.levelStats["legacy"].totalAttempts || 0));
			newState.levelStats["legacy"].totalAttempts += attemptsDiff;
		}

		const finalCorrectSum = Object.values(newState.levelStats).reduce((a, b) => a + (b.totalCorrect || 0), 0);
		const finalAttemptsSum = Object.values(newState.levelStats).reduce((a, b) => a + (b.totalAttempts || 0), 0);
		newState.totalCorrect = finalCorrectSum + (newState.restoredPoints || 0);
		newState.totalAttempts = finalAttemptsSum;

		return newState;
	}
}

export const progressStore = new ProgressStoreClass();
