import { logService } from "./logService";

/**
 * Сервіс для розрахунку ударного режиму (Streak)
 */
export const streakService = {
	/**
	 * Розраховує оновлений стрік на основі поточної відповіді
	 */
	calculateStreak(
		currentStreak: number,
		lastCorrectDate: string | null,
		dailyCorrect: number,
		lastStreakUpdateDate: string | null = null,
	): {
		streak: number;
		dailyCorrect: number;
		lastCorrectDate: string;
		lastStreakUpdateDate: string | null;
	} {
		const today = new Date().toLocaleDateString('en-CA');
		let newStreak = currentStreak;
		let newDailyCorrect = dailyCorrect;
		let newLastStreakUpdateDate = lastStreakUpdateDate || null;

		logService.log("stats", `Streak calculation started`, {
			today,
			currentStreak,
			dailyCorrect,
			lastCorrectDate,
			lastStreakUpdateDate
		});

		if (!lastCorrectDate || lastCorrectDate !== today) {
			logService.log("stats", `First correct answer today or ever`);
			newDailyCorrect = 1;
		} else {
			newDailyCorrect++;
		}

		// Якщо сьогодні ще не оновлювали стрік і досягли мети
		// Додаємо захисну перевірку: якщо стрік 0, але мета досягнута - дозволяємо інкремент (Self-healing)
		const needsUpdate = lastStreakUpdateDate !== today || newStreak === 0;

		if (newDailyCorrect >= 10 && needsUpdate) {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const yesterdayStr = yesterday.toLocaleDateString('en-CA');

			logService.log("stats", `Daily goal reached (10+). Checking records:`, {
				yesterdayStr,
				lastStreakUpdateDate,
				currentStreak: newStreak
			});

			if (lastStreakUpdateDate === yesterdayStr) {
				newStreak++;
				logService.log("stats", `Streak incremented: ${newStreak}`);
			} else if (lastStreakUpdateDate !== today || newStreak === 0) {
				// Встановлюємо 1, якщо це новий стрік або ми відновлюємось після збою (streak 0)
				newStreak = 1;
				logService.log("stats", `Streak set to 1 (new start or self-healing)`);
			}
			newLastStreakUpdateDate = today;
		} else {
			logService.log("stats", `Daily goal not yet met or already updated today`, {
				count: newDailyCorrect,
				updatedToday: lastStreakUpdateDate === today
			});
		}

		const result = {
			streak: newStreak,
			dailyCorrect: newDailyCorrect,
			lastCorrectDate: today,
			lastStreakUpdateDate: newLastStreakUpdateDate
		};

		logService.log("stats", `Streak calculation finished`, result);
		return result;
	},
};
