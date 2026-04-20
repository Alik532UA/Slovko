import { FriendsService } from "../firebase/FriendsService";
import { logService } from "./logService.svelte";
import { db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

// Назви колекцій (використовуємо прямі значення, як і в інших сервісах)
const COLLECTIONS = {
	PROFILES: "profiles",
};

export interface LeaderInfo {
	uid: string;
	name: string;
	totalCorrect: number;
	timestamp: number;
}

/**
 * Сервіс для фонового відстеження лідера рейтингу
 */
class LeaderboardSyncService {
	private leaderCache: LeaderInfo | null = null;
	private readonly CACHE_TTL = 5 * 60 * 1000; // 5 хвилин

	/**
	 * Отримує дані про поточного лідера (з кешем)
	 */
	async getLeader(): Promise<LeaderInfo | null> {
		const now = Date.now();
		if (this.leaderCache && now - this.leaderCache.timestamp < this.CACHE_TTL) {
			return this.leaderCache;
		}

		try {
			// Отримуємо топ-1 користувача (Загальна кількість правильних відповідей)
			const lb = await FriendsService.getLeaderboard("totalCorrect", "all", 1);
			if (lb && lb.length > 0) {
				const top = lb[0];
				this.leaderCache = {
					uid: top.uid,
					name: top.displayName || "Leader",
					totalCorrect: top.totalCorrect || 0,
					timestamp: now,
				};
				logService.log("sync", "Leader updated from leaderboard", this.leaderCache);
				return this.leaderCache;
			}
		} catch (e) {
			logService.error("sync", "Error syncing leader:", e);
		}
		return null;
	}

	/**
	 * Миттєва верифікація рахунку лідера за його UID (без кешу)
	 * Використовується для фінального сповіщення про обгін
	 */
	async verifyLeaderScore(uid: string): Promise<number | null> {
		try {
			const userDoc = await getDoc(doc(db, COLLECTIONS.PROFILES, uid));
			if (userDoc.exists()) {
				const data = userDoc.data();
				return data.totalCorrect || 0;
			}
		} catch (e) {
			logService.error("sync", "Error verifying leader score:", e);
		}
		return null;
	}

	/**
	 * Очищує кеш лідера (наприклад, при зміні мови або перезавантаженні)
	 */
	clearCache() {
		this.leaderCache = null;
	}
}

export const leaderboardSyncService = new LeaderboardSyncService();
