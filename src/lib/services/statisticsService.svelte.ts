import {
	collection,
	getDocs,
	query,
	where,
	orderBy,
	doc,
	getDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { logService } from "./logService";
import { progressStore } from "../stores/progressStore.svelte";
import { 
	type DailyActivity, 
	type LevelStats,
	DailyActivitySchema 
} from "../data/schemas";

/**
 * StatisticsService — сервіс для роботи з історією активності та прогресом.
 * Використовує Svelte Runes для реактивності, де це необхідно.
 */
class StatisticsServiceClass {
	// Реактивні дані для календаря або поточної статистики
	historyCache = $state<Record<string, DailyActivity>>({});
	isLoading = $state(false);
	private readonly MAX_CACHE_SIZE = 60; // Зберігаємо максимум 60 днів у кеші

	/**
	 * Отримати історію активності за діапазон дат (YYYY-MM-DD).
	 */
	async getHistoryByRange(startDate: string, endDate: string): Promise<DailyActivity[]> {
		if (!auth.currentUser) return [];
		const uid = auth.currentUser.uid;
		this.isLoading = true;

		try {
			const historyRef = collection(db, "users", uid, "history");
			// Firestore дозволяє порівнювати ID документів (дату) як рядки
			const q = query(
				historyRef,
				where("__name__", ">=", startDate),
				where("__name__", "<=", endDate),
				orderBy("__name__", "asc")
			);

			const snapshot = await getDocs(q);
			const results: DailyActivity[] = [];

			snapshot.docs.forEach((doc) => {
				try {
					const data = DailyActivitySchema.parse(doc.data());
					results.push(data);
					this.addToCache(data);
				} catch (e) {
					logService.error("stats", `Failed to parse history doc ${doc.id}:`, e);
				}
			});

			return results;
		} catch (error) {
			logService.error("stats", "Error fetching history range:", error);
			return [];
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Додає дані в кеш з контролем розміру
	 */
	private addToCache(data: DailyActivity) {
		this.historyCache[data.date] = data;
		
		const keys = Object.keys(this.historyCache);
		if (keys.length > this.MAX_CACHE_SIZE) {
			// Видаляємо найстаріший запис (за ключем-датою)
			const oldestKey = keys.sort()[0];
			delete this.historyCache[oldestKey];
		}
	}

	/**
	 * Отримати дані за конкретний день.
	 */
	async getDailyStats(date: string): Promise<DailyActivity | null> {
		if (this.historyCache[date]) return this.historyCache[date];
		
		if (!auth.currentUser) return null;
		const uid = auth.currentUser.uid;

		try {
			const docRef = doc(db, "users", uid, "history", date);
			const snap = await getDoc(docRef);
			
			if (snap.exists()) {
				const data = DailyActivitySchema.parse(snap.data());
				this.addToCache(data);
				return data;
			}
			return null;
		} catch (error) {
			logService.error("stats", `Error fetching daily stats for ${date}:`, error);
			return null;
		}
	}

	/**
	 * Аварійне відновлення статистики з історії.
	 * Просумовує дані з колекції history для відновлення агрегатів у профілі.
	 */
	async recoverProgressFromHistory() {
		if (!auth.currentUser) return;
		const uid = auth.currentUser.uid;
		const historyRef = collection(db, "users", uid, "history");
		
		logService.warn("stats", "Starting progress recovery from history...");

		try {
			const snapshot = await getDocs(historyRef);
			if (snapshot.empty) {
				logService.log("stats", "No history found to recover from.");
				return;
			}

			const recoveredLevelStats: Record<string, LevelStats> = {};
			let totalCorrect = 0;
			let totalAttempts = 0;
			let maxDate = "";

			snapshot.docs.forEach(doc => {
				const data = doc.data() as DailyActivity;
				totalCorrect += data.totalCorrect || 0;
				totalAttempts += data.totalAttempts || 0;
				
				if (data.date > maxDate) {
					maxDate = data.date;
				}

				if (data.levelStats) {
					for (const [lvl, stats] of Object.entries(data.levelStats)) {
						if (!recoveredLevelStats[lvl]) {
							recoveredLevelStats[lvl] = {
								totalCorrect: 0,
								totalAttempts: 0,
								bestCorrectStreak: 0,
								currentCorrectStreak: 0
							};
						}
						recoveredLevelStats[lvl].totalCorrect += stats.correct || 0;
						recoveredLevelStats[lvl].totalAttempts += stats.attempts || 0;
					}
				}
			});

			// Оновлюємо локальний стор зі зміненими агрегатами
			const currentProgress = progressStore.value;
			progressStore._internalSet({
				...currentProgress,
				totalCorrect: Math.max(currentProgress.totalCorrect, totalCorrect),
				totalAttempts: Math.max(currentProgress.totalAttempts, totalAttempts),
				lastCorrectDate: maxDate || currentProgress.lastCorrectDate,
				levelStats: this.mergeLevelStats(currentProgress.levelStats, recoveredLevelStats)
			});

			logService.log("stats", `Progress recovered! Total Correct: ${totalCorrect}`);
		} catch (error) {
			logService.error("stats", "Error during progress recovery:", error);
		}
	}

	/**
	 * Логіка злиття статистики рівнів (допоміжний метод)
	 */
	private mergeLevelStats(local: Record<string, LevelStats>, recovered: Record<string, any>) {
		const merged = { ...local };
		for (const [lvl, r] of Object.entries(recovered)) {
			const l = local[lvl];
			if (!l) {
				merged[lvl] = r as LevelStats;
			} else {
				// Вибираємо об'єкт з більшим прогресом (VULN_08)
				if ((r.totalCorrect || 0) > l.totalCorrect) {
					merged[lvl] = {
						...l,
						totalCorrect: r.totalCorrect,
						totalAttempts: r.totalAttempts,
						bestCorrectStreak: Math.max(l.bestCorrectStreak, r.bestCorrectStreak || 0)
					};
				}
			}
		}
		return merged;
	}

	/**
	 * Підготувати дані для "Heatmap" активності.
	 * Повертає масив документів за період, відфільтрований та нормалізований.
	 */
	async getActivityHeatmap(days: number = 365): Promise<{ date: string, count: number, level: number }[]> {
		const end = new Date();
		const start = new Date();
		start.setDate(end.getDate() - days);

		const startDateStr = start.toISOString().split("T")[0];
		const endDateStr = end.toISOString().split("T")[0];

		const history = await this.getHistoryByRange(startDateStr, endDateStr);
		
		return history.map(day => {
			const count = day.totalCorrect || 0;
			// Визначаємо рівень інтенсивності (0-4)
			let level = 0;
			if (count > 0 && count < 10) level = 1;
			else if (count >= 10 && count < 30) level = 2;
			else if (count >= 30 && count < 60) level = 3;
			else if (count >= 60) level = 4;

			return {
				date: day.date,
				count,
				level
			};
		});
	}

	/**
	 * Очистити кеш (наприклад, при логауті)
	 */
	clearCache() {
		this.historyCache = {};
	}
}

export const statisticsService = new StatisticsServiceClass();
