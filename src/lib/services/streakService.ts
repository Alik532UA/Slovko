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
		let newLastStreakUpdateDate = lastStreakUpdateDate;

		if (!lastCorrectDate || lastCorrectDate !== today) {
			newDailyCorrect = 1;
		} else {
			newDailyCorrect++;
		}

		// Якщо сьогодні ще не оновлювали стрік і досягли мети
		if (newDailyCorrect >= 10 && lastStreakUpdateDate !== today) {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const yesterdayStr = yesterday.toLocaleDateString('en-CA');

			if (lastStreakUpdateDate === yesterdayStr) {
				newStreak++;
			} else {
				// Якщо це перший стрік або був пропуск
				newStreak = 1;
			}
			newLastStreakUpdateDate = today;
		}

		return {
			streak: newStreak,
			dailyCorrect: newDailyCorrect,
			lastCorrectDate: today,
			lastStreakUpdateDate: newLastStreakUpdateDate
		};
	},
};
