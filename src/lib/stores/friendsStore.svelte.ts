import { auth } from "../firebase/config";
import { FriendsService, type FollowRecord, type UserProfile } from "../firebase/FriendsService";
import { logService } from "../services/logService";

class FriendsStoreClass {
	following = $state<FollowRecord[]>([]);
	followers = $state<FollowRecord[]>([]);
	profilesCache = $state<Record<string, UserProfile>>({});
	
	isLoading = $state(false);
	lastUpdated = $state(0);

	/**
	 * Завантажити всі дані про друзів
	 */
	async refreshAll() {
		if (!auth.currentUser || this.isLoading) return;
		this.isLoading = true;

		try {
			const [following, followers] = await Promise.all([
				FriendsService.getFollowing(),
				FriendsService.getFollowers()
			]);

			this.following = following;
			this.followers = followers;
			this.lastUpdated = Date.now();
			
			logService.log("presence", `Friends store refreshed: ${following.length} following, ${followers.length} followers`);

			// Запускаємо фонове оновлення профілів для актуалізації імен
			this.refreshProfiles([...following, ...followers]);
		} catch (error) {
			logService.error("presence", "Failed to refresh friends store:", error);
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Фонове завантаження актуальних профілів для списку UIDs
	 */
	private async refreshProfiles(records: FollowRecord[]) {
		// Беремо унікальні UIDs
		const uids = [...new Set(records.map(r => r.uid))];
		
		for (const uid of uids) {
			// Якщо бачимо ім'я "User" або в кеші пусто - завантажуємо актуальний профіль
			const record = records.find(r => r.uid === uid);
			if (!this.profilesCache[uid] || record?.displayName === "User") {
				const profile = await FriendsService.getUserProfile(uid);
				if (profile) {
					this.profilesCache[uid] = profile;
					
					// Якщо в списку було "User", а в профілі інше - запускаємо синхронізацію в БД
					if (record?.displayName !== profile.displayName) {
						FriendsService.refreshContactData(uid);
					}
				}
			}
		}
	}

	/**
	 * Отримати ім'я користувача (пріоритет на кеш профілю)
	 */
	resolveName(uid: string, fallback: string): string {
		return this.profilesCache[uid]?.displayName || fallback || "User";
	}

	/**
	 * Отримати фото користувача (пріоритет на кеш профілю)
	 */
	resolvePhoto(uid: string, fallback: string | null): string | null {
		return this.profilesCache[uid]?.photoURL || fallback;
	}

	/**
	 * Отримати профіль користувача з кешу або завантажити
	 */
	async getProfile(uid: string): Promise<UserProfile | null> {
		if (this.profilesCache[uid]) return this.profilesCache[uid];

		const profile = await FriendsService.getUserProfile(uid);
		if (profile) {
			this.profilesCache[uid] = profile;
		}
		return profile;
	}

	/**
	 * Взаємні друзі (реактивно)
	 */
	mutualFriends = $derived.by(() => {
		const followerUids = new Set(this.followers.map(f => f.uid));
		return this.following.filter(f => followerUids.has(f.uid));
	});

	/**
	 * Перевірити чи користувач у підписках (реактивно)
	 */
	isFollowing(uid: string): boolean {
		return this.following.some(f => f.uid === uid);
	}

	/**
	 * Перевірити чи користувач підписаний на мене (реактивно)
	 */
	isFollower(uid: string): boolean {
		return this.followers.some(f => f.uid === uid);
	}

	/**
	 * Перевірити чи ми взаємні друзі (реактивно)
	 */
	isMutual(uid: string): boolean {
		return this.isFollowing(uid) && this.isFollower(uid);
	}

	/**
	 * Скинути стан (при логауті)
	 */
	reset() {
		this.following = [];
		this.followers = [];
		this.profilesCache = {};
		this.lastUpdated = 0;
	}
}

export const friendsStore = new FriendsStoreClass();
