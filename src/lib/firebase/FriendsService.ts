/**
 * FriendsService - Сервіс для управління підписками та друзями
 *
 * Структура Firestore:
 * /users/{uid}/following/{targetUid} - на кого підписаний користувач
 * /users/{uid}/followers/{followerUid} - хто підписаний на користувача
 * /users/{uid}/profile - публічний профіль (displayName, photoURL, searchableEmail)
 */

import {
	collection,
	doc,
	setDoc,
	getDocs,
	getDoc,
	query,
	where,
	orderBy,
	limit,
	serverTimestamp,
	getCountFromServer,
	writeBatch,
	documentId,
	type Timestamp,
} from "firebase/firestore";
import { db, auth } from "./config";
import { authStore } from "./authStore.svelte";
import { logService } from "../services/logService";
import type { UserPrivacySettings } from "../types";

/** Інтерфейс публічного профілю */
export interface UserProfile {
	uid: string;
	displayName: string;
	photoURL: string | null;
	searchableEmail?: string; // Для пошуку (опціонально)
	privacy?: UserPrivacySettings;
}

/** Інтерфейс підписки */
export interface FollowRecord {
	uid: string;
	displayName: string;
	photoURL: string | null;
	followedAt: Timestamp | null;
}

/** Елемент лідерборду */
export interface LeaderboardEntry {
	uid: string;
	displayName: string;
	score: number;
	photoURL: string | null;
	isMe: boolean;
	isAnonymous: boolean;
	meetsThreshold: boolean;
	rank: number | null;
	totalAttempts: number;
	totalCorrect: number;
	bestStreak: number;
	bestCorrectStreak: number;
}

/** Колекції Firestore */
const COLLECTIONS = {
	USERS: "users",
	FOLLOWING: "following",
	FOLLOWERS: "followers",
	PROFILES: "profiles",
};

/**
 * Сервіс для керування друзями та підписками
 */
const LEADERBOARD_CACHE: Record<string, { data: LeaderboardEntry[], timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 хвилин
const MAX_FOLLOWING = 500;

/** Пороги для відображення в лідерборді (Global SSoT) */
export const LEADERBOARD_THRESHOLDS = {
	totalCorrect: 50,
	bestStreak: 2,
	bestCorrectStreak: 11, // Більше 10
	accuracy: 100, // min totalAttempts
	activeDaysCount: 1, // DEBUG: потім поставити 5
};

export const FriendsService = {
	/**
	 * Підписатися на користувача (Атомарно)
	 * @param targetUid - UID користувача, на якого підписуємось
	 * @param knownProfile - Опціонально: вже відомі дані профілю (щоб не завантажувати з БД)
	 */
	async follow(
		targetUid: string,
		knownProfile?: { displayName: string; photoURL: string | null },
	): Promise<boolean> {
		if (!auth.currentUser) return false;
		const currentUid = auth.currentUser.uid;
		if (currentUid === targetUid) return false;

		try {
			// Перевірка ліміту підписок
			const counts = await this.getCounts(currentUid);
			if (counts.following >= MAX_FOLLOWING) {
				logService.warn("sync", `Follow limit reached (${MAX_FOLLOWING})`);
				return false;
			}

			// Використовуємо відомий профіль або завантажуємо з БД
			const targetProfile = knownProfile || (await this.getUserProfile(targetUid));

			if (!targetProfile) {
				logService.warn("sync", `Cannot follow ${targetUid}: Profile not found`);
				return false;
			}

			const batch = writeBatch(db);

			// Додаємо в "following" поточного користувача
			const followingRef = doc(
				db,
				COLLECTIONS.USERS,
				currentUid,
				COLLECTIONS.FOLLOWING,
				targetUid,
			);
			batch.set(followingRef, {
				uid: targetUid,
				displayName: targetProfile.displayName,
				photoURL: targetProfile.photoURL,
				followedAt: serverTimestamp(),
			});

			// Додаємо в "followers" цільового користувача
			const followerRef = doc(
				db,
				COLLECTIONS.USERS,
				targetUid,
				COLLECTIONS.FOLLOWERS,
				currentUid,
			);
			batch.set(followerRef, {
				uid: currentUid,
				displayName: auth.currentUser.displayName || "User",
				photoURL: auth.currentUser.photoURL,
				followedAt: serverTimestamp(),
			});

			await batch.commit();
			logService.log("sync", `Followed user: ${targetUid}`);

			// Remote logging for analysis
			logService.logToRemote("friend_follow_success", {
				targetUid,
				targetName: targetProfile.displayName
			});

			return true;
		} catch (error: unknown) {
			logService.error("sync", "Error following user:", error);

			// Remote logging for errors
			logService.logToRemote("friend_follow_error", {
				targetUid,
				error: (error as Error).message || String(error)
			});

			return false;
		}
	},

	/**
	 * Відписатися від користувача (Атомарно)
	 * @param targetUid - UID користувача, від якого відписуємось
	 */
	async unfollow(targetUid: string): Promise<boolean> {
		if (!auth.currentUser) return false;
		const currentUid = auth.currentUser.uid;

		try {
			const batch = writeBatch(db);

			const followingRef = doc(
				db,
				COLLECTIONS.USERS,
				currentUid,
				COLLECTIONS.FOLLOWING,
				targetUid,
			);
			batch.delete(followingRef);

			const followerRef = doc(
				db,
				COLLECTIONS.USERS,
				targetUid,
				COLLECTIONS.FOLLOWERS,
				currentUid,
			);
			batch.delete(followerRef);

			await batch.commit();
			logService.log("sync", `Unfollowed user: ${targetUid}`);

			// Remote logging
			logService.logToRemote("friend_unfollow_success", { targetUid });

			return true;
		} catch (error: unknown) {
			logService.error("sync", "Error unfollowing user:", error);

			// Remote logging
			logService.logToRemote("friend_unfollow_error", {
				targetUid,
				error: (error as Error).message || String(error)
			});

			return false;
		}
	},

	/**
	 * Отримати список підписок (на кого підписаний)
	 * @param uid - UID користувача (за замовчуванням - поточний)
	 */
	async getFollowing(uid?: string): Promise<FollowRecord[]> {
		const targetUid = uid || auth.currentUser?.uid;
		if (!targetUid) return [];

		try {
			const followingRef = collection(
				db,
				COLLECTIONS.USERS,
				targetUid,
				COLLECTIONS.FOLLOWING,
			);
			const snapshot = await getDocs(followingRef);
			const results = snapshot.docs.map((doc) => doc.data() as FollowRecord);

			logService.log("sync", `Fetched following for ${targetUid}: ${results.length} items`, results.map(r => r.uid));
			return results;
		} catch (error: unknown) {
			logService.error("sync", "Error getting following:", error);
			logService.logToRemote("friend_get_following_error", { targetUid, error: (error as Error).message });
			return [];
		}
	},

	/**
	 * Видалити підписника (змусити іншого відписатися від мене)
	 * @param followerUid - UID підписника, якого треба видалити
	 */
	async removeFollower(followerUid: string): Promise<boolean> {
		if (!auth.currentUser) return false;
		const currentUid = auth.currentUser.uid;

		try {
			logService.log("sync", `Attempting to remove follower: ${followerUid} from user: ${currentUid}`);
			const batch = writeBatch(db);

			// Видаляємо з моїх followers
			const followerRef = doc(
				db,
				COLLECTIONS.USERS,
				currentUid,
				COLLECTIONS.FOLLOWERS,
				followerUid,
			);
			batch.delete(followerRef);

			// Видаляємо з його following
			const followingRef = doc(
				db,
				COLLECTIONS.USERS,
				followerUid,
				COLLECTIONS.FOLLOWING,
				currentUid,
			);
			batch.delete(followingRef);

			await batch.commit();
			logService.log("sync", `Successfully removed follower: ${followerUid}`);
			logService.logToRemote("friend_remove_follower_success", { followerUid });
			return true;
		} catch (error: unknown) {
			logService.error("sync", "Error removing follower:", error);
			logService.logToRemote("friend_remove_follower_error", { followerUid, error: (error as Error).message });
			return false;
		}
	},

	/**
	 * Оновити дані контакту в локальних списках (following/followers), якщо вони змінилися.
	 * Викликається для синхронізації денормалізованих даних.
	 */
	async refreshContactData(targetUid: string): Promise<void> {
		if (!auth.currentUser) return;
		const currentUid = auth.currentUser.uid;

		try {
			const profile = await this.getUserProfile(targetUid);
			if (!profile) return;

			const batch = writeBatch(db);
			let hasChanges = false;

			// 1. Перевіряємо в following
			const followingRef = doc(db, COLLECTIONS.USERS, currentUid, COLLECTIONS.FOLLOWING, targetUid);
			const followingSnap = await getDoc(followingRef);
			if (followingSnap.exists()) {
				const data = followingSnap.data();
				if (data.displayName !== profile.displayName || data.photoURL !== profile.photoURL) {
					batch.update(followingRef, {
						displayName: profile.displayName,
						photoURL: profile.photoURL
					});
					hasChanges = true;
				}
			}

			// 2. Перевіряємо в followers
			const followerRef = doc(db, COLLECTIONS.USERS, currentUid, COLLECTIONS.FOLLOWERS, targetUid);
			const followerSnap = await getDoc(followerRef);
			if (followerSnap.exists()) {
				const data = followerSnap.data();
				if (data.displayName !== profile.displayName || data.photoURL !== profile.photoURL) {
					batch.update(followerRef, {
						displayName: profile.displayName,
						photoURL: profile.photoURL
					});
					hasChanges = true;
				}
			}

			if (hasChanges) {
				await batch.commit();
				logService.log("sync", `Synchronized contact data for: ${targetUid}`);
			}
		} catch (error) {
			logService.error("sync", "Error refreshing contact data:", error);
		}
	},

	/**
	 * @deprecated Use refreshContactData instead
	 */
	async refreshFriendData(targetUid: string): Promise<void> {
		return this.refreshContactData(targetUid);
	},

	async getFollowers(uid?: string): Promise<FollowRecord[]> {
		const targetUid = uid || auth.currentUser?.uid;
		if (!targetUid) return [];

		try {
			const followersRef = collection(
				db,
				COLLECTIONS.USERS,
				targetUid,
				COLLECTIONS.FOLLOWERS,
			);
			const snapshot = await getDocs(followersRef);
			const results = snapshot.docs.map((doc) => doc.data() as FollowRecord);

			logService.log("sync", `Fetched followers for ${targetUid}: ${results.length} items`, results.map(r => r.uid));
			return results;
		} catch (error: unknown) {
			logService.error("sync", "Error getting followers:", error);
			logService.logToRemote("friend_get_followers_error", { targetUid, error: (error as Error).message });
			return [];
		}
	},

	/**
	 * Отримати список взаємних друзів
	 */
	async getMutualFriends(): Promise<FollowRecord[]> {
		if (!auth.currentUser) return [];

		try {
			const [following, followers] = await Promise.all([
				this.getFollowing(),
				this.getFollowers(),
			]);

			const followerUids = new Set(followers.map((f) => f.uid));
			return following.filter((f) => followerUids.has(f.uid));
		} catch (error) {
			logService.error("sync", "Error getting mutual friends:", error);
			return [];
		}
	},

	/**
	 * Перевірити, чи підписаний на користувача
	 * @param targetUid - UID користувача для перевірки
	 */
	async isFollowing(targetUid: string): Promise<boolean> {
		if (!auth.currentUser) return false;

		try {
			const followingRef = doc(
				db,
				COLLECTIONS.USERS,
				auth.currentUser.uid,
				COLLECTIONS.FOLLOWING,
				targetUid,
			);
			const snapshot = await getDoc(followingRef);
			return snapshot.exists();
		} catch (error) {
			logService.error("sync", "Error checking follow status:", error);
			return false;
		}
	},

	/**
	 * Пошук користувачів за ім'ям або email (Без врахування регістру)
	 */
	async searchUsers(
		searchQuery: string,
		maxResults = 10,
	): Promise<UserProfile[]> {
		if (!searchQuery || searchQuery.length < 2) return [];

		try {
			const queryLower = searchQuery.toLowerCase().trim();
			const profilesRef = collection(db, COLLECTIONS.PROFILES);

			// 1. Спочатку спробуємо знайти точний збіг по email
			// Фільтруємо за privacy.showInSearch
			const emailQuery = query(
				profilesRef,
				where("searchableEmail", "==", queryLower),
				where("privacy.showInSearch", "==", true),
				limit(maxResults),
			);

			const emailSnapshot = await getDocs(emailQuery);
			if (!emailSnapshot.empty) {
				return emailSnapshot.docs.map(
					(doc) => ({ ...doc.data(), uid: doc.id }) as UserProfile,
				);
			}

			/* 
			DISABLED FOR SECURITY: Searching by name allows impersonation and finding random users.
			Only exact email match is allowed.
			
			// 2. Якщо не знайдено, шукаємо за displayNameLower (префіксний пошук)
			// Firestore не дозволяє декілька операторів inequality/range на різних полях одночасно в одному запиті
			// Тому ми використовуємо displayNameLower для фільтрації і додаємо showInSearch
			const nameQuery = query(
				profilesRef,
				where("displayNameLower", ">=", queryLower),
				where("displayNameLower", "<=", queryLower + "\uf8ff"),
				where("privacy.showInSearch", "==", true),
				limit(maxResults),
			);

			const nameSnapshot = await getDocs(nameQuery);
			const currentUid = auth.currentUser?.uid;

			return nameSnapshot.docs
				.map((doc) => ({ ...doc.data(), uid: doc.id }) as UserProfile)
				.filter((profile) => profile.uid !== currentUid);
			*/
			return [];
		} catch (error) {
			logService.error("sync", "Error searching users:", error);
			return [];
		}
	},

	/**
	 * Отримати кілька профілів за один запит (Batch Get)
	 */
	async getUserProfiles(uids: string[]): Promise<UserProfile[]> {
		if (!uids.length) return [];

		try {
			const profilesRef = collection(db, COLLECTIONS.PROFILES);
			// Firestore дозволяє до 30 елементів в операторі 'in'
			const batches = [];
			for (let i = 0; i < uids.length; i += 30) {
				const chunk = uids.slice(i, i + 30);
				const q = query(profilesRef, where(documentId(), "in", chunk));
				batches.push(getDocs(q));
			}

			const snapshots = await Promise.all(batches);
			return snapshots.flatMap(snap =>
				snap.docs.map(doc => ({ ...doc.data(), uid: doc.id }) as UserProfile)
			);
		} catch (error) {
			logService.error("sync", "Error getting batch user profiles:", error);
			return [];
		}
	},

	/**
	 * Отримати публічний профіль користувача
	 */
	async getUserProfile(uid: string): Promise<UserProfile | null> {
		try {
			const profileRef = doc(db, COLLECTIONS.PROFILES, uid);
			const snapshot = await getDoc(profileRef);

			if (snapshot.exists()) {
				return { ...snapshot.data(), uid } as UserProfile;
			}

			return null;
		} catch (error) {
			logService.error("sync", "Error getting user profile:", error);
			return null;
		}
	},

	/**
	 * Оновити свій публічний профіль для пошуку
	 */
	async updatePublicProfile(): Promise<void> {
		if (!auth.currentUser) return;

		try {
			const profileRef = doc(db, COLLECTIONS.PROFILES, auth.currentUser.uid);

			// Отримуємо поточний профіль, щоб зберегти налаштування приватності
			const snapshot = await getDoc(profileRef);
			const currentData = snapshot.exists() ? snapshot.data() : {};

			// Визначаємо найкраще ім'я для відображення
			const displayName =
				auth.currentUser.displayName ||
				auth.currentUser.email?.split("@")[0] ||
				(auth.currentUser.isAnonymous ? "Гість" : "User");

			// Дефолтні налаштування приватності, якщо вони відсутні
			const privacy = currentData.privacy || {
				showInSearch: true,
				allowFriendRequests: true,
				shareStats: true,
			};

			await setDoc(
				profileRef,
				{
					displayName: displayName,
					displayNameLower: displayName.toLowerCase(),
					photoURL: auth.currentUser.photoURL,
					isAnonymous: auth.currentUser.isAnonymous,
					searchableEmail: auth.currentUser.email?.toLowerCase() || null,
					updatedAt: serverTimestamp(),
					privacy: privacy,
				},
				{ merge: true },
			);

			logService.log("sync", "Public profile updated");
		} catch (error) {
			logService.error("sync", "Error updating public profile:", error);
		}
	},

	/**
	 * Отримати кількість підписників та підписок (Оптимізовано)
	 */
	async getCounts(
		uid?: string,
	): Promise<{ following: number; followers: number }> {
		const targetUid = uid || auth.currentUser?.uid;
		if (!targetUid) return { following: 0, followers: 0 };

		try {
			const followingRef = collection(
				db,
				COLLECTIONS.USERS,
				targetUid,
				COLLECTIONS.FOLLOWING,
			);
			const followersRef = collection(
				db,
				COLLECTIONS.USERS,
				targetUid,
				COLLECTIONS.FOLLOWERS,
			);

			const [followingSnap, followersSnap] = await Promise.all([
				getCountFromServer(followingRef),
				getCountFromServer(followersRef),
			]);

			return {
				following: followingSnap.data().count,
				followers: followersSnap.data().count,
			};
		} catch (error) {
			logService.error("sync", "Error getting counts:", error);
			return { following: 0, followers: 0 };
		}
	},

	/**
	 * Отримати глобальний лідерборд
	 * @param metric - Метрика (totalCorrect, bestStreak, bestCorrectStreak, accuracy)
	 * @param cefrLevel - Рівень (optional)
	 * @param limitCount - Кількість результатів
	 */
	async getLeaderboard(
		metric:
			| "totalCorrect"
			| "bestStreak"
			| "bestCorrectStreak"
			| "accuracy"
			| "activeDaysCount" = "totalCorrect",
		cefrLevel: string = "all",
		limitCount: number = 20,
	): Promise<LeaderboardEntry[]> {
		const cacheKey = `${metric}_${cefrLevel}_${limitCount}`;
		const now = Date.now();

		if (LEADERBOARD_CACHE[cacheKey] && (now - LEADERBOARD_CACHE[cacheKey].timestamp < CACHE_TTL)) {
			logService.log("presence", "Returning cached leaderboard");
			return LEADERBOARD_CACHE[cacheKey].data;
		}

		try {
			const profilesRef = collection(db, COLLECTIONS.PROFILES);
			const currentUid = authStore.user?.uid || auth.currentUser?.uid;

			// Беремо 100, щоб після фільтрації за порогами залишилось достатньо для TOP-20
			const fetchLimit = 100;

			// Визначаємо поле для сортування
			let sortField: string = metric;
			if (cefrLevel !== "all") {
				if (metric === "bestStreak") {
					sortField = metric;
				} else {
					sortField = `level_${cefrLevel}_${metric}`;
				}
			}

			// Створюємо базовий запит
			let q = query(
				profilesRef,
				orderBy(sortField, "desc"),
				limit(fetchLimit),
			);

			// Якщо обрано рівень, ми також можемо додати фільтр, щоб прибрати тих, хто ще не грав на ньому
			if (cefrLevel !== "all") {
				q = query(q, where(sortField, ">", 0));
			}

			const snapshot = await getDocs(q);
			const results: LeaderboardEntry[] = snapshot.docs.map((doc) => {
				const data = doc.data() as Record<string, unknown>;
				const isAnonymous = data.isAnonymous === true ||
					(data.isAnonymous === undefined && !data.searchableEmail);

				// Перевірка порогу на основі ГЛОБАЛЬНИХ даних (SSoT)
				let meetsThreshold = true;
				const globalTotalCorrect = (data.totalCorrect as number) || 0;
				const globalBestStreak = (data.bestStreak as number) || 0;
				const globalBestCorrectStreak = (data.bestCorrectStreak as number) || 0;
				const globalTotalAttempts = (data.totalAttempts as number) || 0;

				if (metric === "totalCorrect") {
					meetsThreshold = globalTotalCorrect >= LEADERBOARD_THRESHOLDS.totalCorrect;
				} else if (metric === "bestStreak") {
					meetsThreshold = globalBestStreak >= LEADERBOARD_THRESHOLDS.bestStreak;
				} else if (metric === "bestCorrectStreak") {
					meetsThreshold = globalBestCorrectStreak >= LEADERBOARD_THRESHOLDS.bestCorrectStreak;
				} else if (metric === "accuracy") {
					meetsThreshold = globalTotalAttempts >= LEADERBOARD_THRESHOLDS.accuracy;
				} else if (metric === "activeDaysCount") {
					meetsThreshold = ((data.activeDaysCount as number) || 0) >= LEADERBOARD_THRESHOLDS.activeDaysCount;
				}

				return {
					uid: doc.id,
					displayName: (data.displayName as string) || "User",
					score: (data[sortField] as number) || 0,
					photoURL: (data.photoURL as string) || null,
					isMe: doc.id === currentUid,
					isAnonymous,
					meetsThreshold,
					rank: null,
					// Додаткові поля для діагностики та UI
					totalAttempts: globalTotalAttempts,
					totalCorrect: globalTotalCorrect,
					bestStreak: globalBestStreak,
					bestCorrectStreak: globalBestCorrectStreak,
				};
			});

			// Якщо поточного користувача немає в ТОП-100, завантажуємо його окремо
			if (currentUid && !results.find(u => u.uid === currentUid)) {
				const myDoc = await getDoc(doc(db, COLLECTIONS.PROFILES, currentUid));
				if (myDoc.exists()) {
					const data = myDoc.data() as Record<string, unknown>;
					const globalTotalCorrect = (data.totalCorrect as number) || 0;
					const globalBestStreak = (data.bestStreak as number) || 0;
					const globalBestCorrectStreak = (data.bestCorrectStreak as number) || 0;
					const globalTotalAttempts = (data.totalAttempts as number) || 0;

					let meetsThreshold = true;
					if (metric === "totalCorrect") meetsThreshold = globalTotalCorrect >= LEADERBOARD_THRESHOLDS.totalCorrect;
					else if (metric === "bestStreak") meetsThreshold = globalBestStreak >= LEADERBOARD_THRESHOLDS.bestStreak;
					else if (metric === "bestCorrectStreak") meetsThreshold = globalBestCorrectStreak >= LEADERBOARD_THRESHOLDS.bestCorrectStreak;
					else if (metric === "accuracy") meetsThreshold = globalTotalAttempts >= LEADERBOARD_THRESHOLDS.accuracy;
					else if (metric === "activeDaysCount") meetsThreshold = ((data.activeDaysCount as number) || 0) >= LEADERBOARD_THRESHOLDS.activeDaysCount;

					// Детекція анонімності для себе
					const isAnonymous = data.isAnonymous === true ||
						(data.isAnonymous === undefined && !data.searchableEmail);

					results.push({
						uid: currentUid,
						displayName: (data.displayName as string) || "User",
						score: (data[sortField] as number) || 0,
						photoURL: (data.photoURL as string) || null,
						isMe: true,
						isAnonymous,
						meetsThreshold,
						rank: null,
						totalAttempts: globalTotalAttempts,
						totalCorrect: globalTotalCorrect,
						bestStreak: globalBestStreak,
						bestCorrectStreak: globalBestCorrectStreak,
					});
				}
			}

			// Фільтрація: прибираємо анонімів (крім себе, якщо я анонім — я все одно маю бачити свій статус)
			let filteredResults = results.filter((u) => u.isMe || !u.isAnonymous);

			// ПУБЛІЧНА Фільтрація: інші бачать тільки тих, хто пройшов поріг
			// Поточний користувач ЗАВЖДИ бачить себе (навіть якщо не пройшов поріг)
			filteredResults = filteredResults.filter((u) => u.isMe || u.meetsThreshold);

			// Сортування результатів: основний score, а при співпадінні - кількість правильних відповідей (вторинний критерій)
			filteredResults.sort((a, b) => {
				if (b.score !== a.score) return b.score - a.score;
				return (b.totalCorrect || 0) - (a.totalCorrect || 0);
			});

			// Відображаємо лише ТОП (ті, хто пройшов поріг)
			const topVisible = filteredResults.filter(u => u.meetsThreshold).slice(0, limitCount);

			// Додаємо ранг для тих, хто пройшов ліміт
			let currentRank = 1;
			const finalPublicResults: LeaderboardEntry[] = topVisible.map((u, index) => {
				if (index > 0) {
					const prev = topVisible[index - 1];
					// Ранг залежить ТІЛЬКИ від основного показника (score)
					if (u.score !== prev.score) {
						currentRank = index + 1;
					}
				}
				return { ...u, rank: currentRank };
			});

			// Якщо я не пройшов ліміт, або я пройшов, але не в ТОП-20 — додаю себе в кінець
			const myEntry = filteredResults.find(u => u.isMe);
			const alreadyInTop = topVisible.some(u => u.uid === currentUid && u.meetsThreshold);

			if (myEntry && !alreadyInTop) {
				logService.log("score", `Adding current user to bottom. meetsThreshold: ${myEntry.meetsThreshold}`);
				finalPublicResults.push({
					...myEntry,
					rank: null // Немає рангу для прихованих/не-топ
				});
			}

			LEADERBOARD_CACHE[cacheKey] = { data: finalPublicResults, timestamp: Date.now() };
			return finalPublicResults;
		} catch (error: unknown) {
			logService.error("sync", "Error getting leaderboard:", error);
			return [];
		}
	},

	/**
	 * Оновити налаштування приватності
	 */
	async updatePrivacySettings(settings: UserPrivacySettings): Promise<boolean> {
		if (!auth.currentUser) return false;

		try {
			const profileRef = doc(db, COLLECTIONS.PROFILES, auth.currentUser.uid);
			await setDoc(
				profileRef,
				{
					privacy: settings,
					updatedAt: serverTimestamp(),
				},
				{ merge: true },
			);

			logService.log("sync", "Privacy settings updated");
			return true;
		} catch (error) {
			logService.error("sync", "Error updating privacy settings:", error);
			return false;
		}
	},

	/**
	 * Очистити кеш лідерборду
	 */
	clearCache(): void {
		Object.keys(LEADERBOARD_CACHE).forEach(key => delete LEADERBOARD_CACHE[key]);
		logService.log("presence", "Leaderboard cache cleared");
	}
};
