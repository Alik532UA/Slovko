import { auth, db } from "../firebase/config";
import { FriendsService, type FollowRecord, type UserProfile } from "../firebase/FriendsService";
import { logService } from "../services/logService";
import { collection, onSnapshot, query } from "firebase/firestore";
import { settingsStore } from "./settingsStore.svelte";

class FriendsStoreClass {
	following = $state<FollowRecord[]>([]);
	followers = $state<FollowRecord[]>([]);
	profilesCache = $state<Record<string, UserProfile>>({});

	isLoading = $state(false);
	lastUpdated = $state(0);
	
	private unsubs: (() => void)[] = [];
	private isFirstFollowerLoad = $state(true);
	private followersLoaded = $state(false);
	private isCheckingNotifications = false;

	constructor() {
		// Використовуємо $effect.root для створення глобального ефекту без прив'язки до компонента
		$effect.root(() => {
			$effect(() => {
				const uids = this.mutualFriends.map(f => f.uid);
				if (uids.length > 0) {
					// Використовуємо динамічний імпорт або відкладений доступ, щоб уникнути ReferenceError при ініціалізації
					import("../firebase/PresenceService.svelte").then(({ PresenceService }) => {
						PresenceService.limitBackgroundTracking(uids, 20);
					});
				}
			});
		});
	}

	/**
	 * Перевірити сповіщення про підписників.
	 * Цей метод має запускатися ТІЛЬКИ коли:
	 * 1. Список підписників завантажено (followersLoaded = true)
	 * 2. Налаштування з хмари завантажено (SyncService.hasInitialData = true)
	 */
	async checkFollowerNotifications() {
		if (!this.isFirstFollowerLoad || !this.followersLoaded || this.isCheckingNotifications) return;

		this.isCheckingNotifications = true;

		try {
			// Додаткова перевірка: чи дійсно SyncService готовий?
			const { SyncService } = await import("../firebase/SyncService.svelte");
			if (!SyncService.hasInitialData) return;

			const lastSeen = settingsStore.value.lastSeenFollowerAt || 0;
			logService.log("sync", `Checking follower notifications. Last seen: ${lastSeen}, Followers: ${this.followers.length}`);
			
			// Сортуємо від найновіших до найстаріших
			const unseenFollowers = this.followers
				.filter(f => f.followedAt && f.followedAt.toMillis() > lastSeen)
				.sort((a, b) => (b.followedAt?.toMillis() || 0) - (a.followedAt?.toMillis() || 0));

			if (unseenFollowers.length > 0) {
				// Показуємо тільки 3 найновіших
				unseenFollowers.slice(0, 3).forEach(f => this.triggerFollowerNotification(f));

				// Але помічаємо ВСІХ як прочитаних (використовуємо таймстамп найновішого)
				const latestMs = unseenFollowers[0].followedAt?.toMillis();
				if (latestMs && latestMs > lastSeen) {
					settingsStore.update({ lastSeenFollowerAt: latestMs });
				}
			}
			
			this.isFirstFollowerLoad = false;
		} finally {
			this.isCheckingNotifications = false;
		}
	}

	/**
	 * Ініціалізувати real-time підписки для поточного користувача
	 */
	init(uid: string) {
		this.stop(); // Очищуємо попередні підписки
		this.isFirstFollowerLoad = true;
		this.followersLoaded = false;
		
		logService.log("sync", "Initializing real-time FriendsStore for:", uid);
		
		const followingRef = collection(db, "users", uid, "following");
		const followersRef = collection(db, "users", uid, "followers");

		// Слухаємо підписки (кого я фоловлю)
		const unsubFollowing = onSnapshot(followingRef, (snapshot) => {
			this.following = snapshot.docs.map(doc => doc.data() as FollowRecord);
			this.lastUpdated = Date.now();
			this.refreshProfiles(this.following);
		}, (err) => {
			logService.error("sync", "Error in following snapshot:", err);
		});

		// Слухаємо підписників (хто мене фоловить)
		const unsubFollowers = onSnapshot(followersRef, (snapshot) => {
			const oldFollowers = this.followers;
			const newFollowers = snapshot.docs.map(doc => doc.data() as FollowRecord);
			
			this.followers = newFollowers;
			this.lastUpdated = Date.now();
			this.followersLoaded = true;
			
			// Спроба 1: Перевірити сповіщення при завантаженні списку
			import("../firebase/SyncService.svelte").then(({ SyncService }) => {
				if (SyncService.hasInitialData && this.isFirstFollowerLoad) {
					this.checkFollowerNotifications();
				}
			});
			
			// Real-time обробка (якщо це вже НЕ перше завантаження)
			if (!this.isFirstFollowerLoad) {
				const oldUids = new Set(oldFollowers.map(f => f.uid));
				const added = newFollowers.filter(f => !oldUids.has(f.uid));
				
				if (added.length > 0) {
					let latestMs = settingsStore.value.lastSeenFollowerAt || 0;
					added.forEach(f => {
						this.triggerFollowerNotification(f);
						if (f.followedAt) {
							const ms = f.followedAt.toMillis();
							if (ms > latestMs) latestMs = ms;
						}
					});
					settingsStore.update({ lastSeenFollowerAt: latestMs });
				}
			}

			this.refreshProfiles(this.followers);
		}, (err) => {
			logService.error("sync", "Error in followers snapshot:", err);
		});

		this.unsubs.push(unsubFollowing, unsubFollowers);
	}

	/**
	 * Викликає сповіщення про нового підписника
	 */
	private triggerFollowerNotification(follower: FollowRecord) {
		import("../firebase/PresenceService.svelte").then(({ PresenceService }) => {
			// Не показуємо, якщо ми вже підписані у відповідь (можливо)
			// Але зазвичай краще показати в будь-якому випадку як приємну подію
			PresenceService.addFollowerNotification(follower.uid, {
				name: follower.displayName,
				photoURL: follower.photoURL
			});
		});
	}

	/**
	 * Зупинити всі підписки
	 */
	stop() {
		this.unsubs.forEach(unsub => unsub());
		this.unsubs = [];
	}

	/**
	 * Завантажити всі дані про друзів (Legacy / Force refresh)
	 */
	async refreshAll() {
		if (!auth.currentUser) return;
		// Метод init тепер робить це автоматично через snapshot
		if (this.unsubs.length === 0) {
			this.init(auth.currentUser.uid);
		}
	}

	/**
	 * Фонове завантаження актуальних профілів для списку UIDs
	 */
	private async refreshProfiles(records: FollowRecord[]) {
		// Беремо унікальні UIDs, яких ще немає в кеші або які потребують оновлення (ім'я "User")
		const uidsToFetch = records
			.filter(r => !this.profilesCache[r.uid] || r.displayName === "User")
			.map(r => r.uid);
		
		const uniqueUids = [...new Set(uidsToFetch)];
		if (uniqueUids.length === 0) return;

		logService.log("presence", `Batch fetching ${uniqueUids.length} profiles...`);
		
		const profiles = await FriendsService.getUserProfiles(uniqueUids);
		
		profiles.forEach(profile => {
			this.profilesCache[profile.uid] = profile;
			
			// Перевіряємо, чи потрібно синхронізувати ім'я в БД
			const record = records.find(r => r.uid === profile.uid);
			if (record && record.displayName !== profile.displayName) {
				FriendsService.refreshContactData(profile.uid);
			}
		});
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
	 * Лічильники (реактивно)
	 */
	followingCount = $derived(this.following.length);
	followersCount = $derived(this.followers.length);

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
		this.stop();
		this.following = [];
		this.followers = [];
		this.profilesCache = {};
		this.lastUpdated = 0;
	}
}

export const friendsStore = new FriendsStoreClass();

