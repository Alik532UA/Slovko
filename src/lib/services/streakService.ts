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
	): {
		streak: number;
		dailyCorrect: number;
		lastCorrectDate: string;
	} {
		// ПОПЕРЕДЖЕННЯ: Використання клієнтської дати є вразливим до маніпуляцій.
		// У майбутньому варто перейти на серверний час Firestore.
		const today = new Date().toISOString().split("T")[0];
		let newStreak = currentStreak;
		let newDailyCorrect = dailyCorrect;

		if (!lastCorrectDate || lastCorrectDate !== today) {
			// Перша відповідь за весь час або новий день
			newDailyCorrect = 1;
		} else {
			// Продовжуємо сьогоднішні відповіді
			newDailyCorrect++;
		}

		// Якщо сьогодні досягли межі вперше за день
		if (newDailyCorrect === 10) {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const yesterdayStr = yesterday.toISOString().split("T")[0];

			if (lastCorrectDate === yesterdayStr) {
				newStreak++;
			} else {
				// Якщо це перший день (null) або був пропуск
				newStreak = 1;
			}
		}

		return {
			streak: newStreak,
			dailyCorrect: newDailyCorrect,
			lastCorrectDate: today,
		};
	},
};
