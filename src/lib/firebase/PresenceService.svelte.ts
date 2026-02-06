import { ref, onValue, set, onDisconnect, serverTimestamp, onChildAdded, remove, query, orderByChild, limitToLast, type Unsubscribe, push, startAt } from "firebase/database";
import { rtdb, auth } from "./config";
import { logService } from "../services/logService";

export type OnlineStatus = "online" | "offline";

export interface UserStatus {
	state: OnlineStatus;
	lastChanged: number;
}

export interface DiscoveryUser {
	uid: string;
	displayName: string;
	photoURL: string | null;
	timestamp: number;
}

export interface Signal {
	id?: string;
	type: "wave" | "wave_back";
	fromUid: string;
	fromName: string;
	fromPhoto: string | null;
	timestamp: number;
}

export interface InteractionEvent {
	id: string;
	type: 'online' | 'incoming_wave' | 'manual_menu' | 'new_follower';
	uid: string;
	profile: { name: string; photoURL: string | null };
	timestamp: number;
	state: 'collapsed' | 'expanded' | 'sent';
}

/**
 * PresenceService — сервіс для відстеження онлайн-статусу та обміну сигналами.
 * 
 * Архітектурні принципи:
 * 1. SSoT: Єдине джерело статусів та подій взаємодії.
 * 2. UDF: Події додаються через addInteraction, видаляються через removeInteraction.
 * 3. Надійність: Використання push() для сигналів та serverTimestamp для фільтрації.
 */
class PresenceServiceClass {
	// Реактивні стани
	friendsStatus = $state(new Map<string, UserStatus>());
	interactions = $state<InteractionEvent[]>([]);
	
	// Внутрішній стан управління підписками
	private statusUnsubscribers: Map<string, { unsub: Unsubscribe, count: number }> = new Map();
	private signalUnsubscribe: Unsubscribe | null = null;
	private discoveryUnsubscribe: Unsubscribe | null = null;
	private currentUid: string | null = null;
	private isInitialized = false;
	private isPaused = false;
	
	// Захист від дублювання та спаму
	private processedSignals: Set<string> = new Set();
	private lastSignalSentAt: Map<string, number> = new Map(); // [targetUid] -> timestamp
	private initialStatusLoaded: Set<string> = new Set();
	
	// Обробники подій
	private boundHandleVisibilityChange: (() => void) | null = null;
	private backgroundUnsubscribers: (() => void)[] = [];
	private lastTrackedUids: string[] = [];

	/**
	 * Налаштовує фонове відстеження статусів для обмеженої кількості друзів.
	 * Це потрібно для роботи сповіщень про вхід друзів в онлайн.
	 */
	limitBackgroundTracking(uids: string[], limit = 20) {
		const toTrack = uids.slice(0, limit);
		
		// Перевірка: чи змінився список UIDs?
		if (this.lastTrackedUids.length === toTrack.length && 
			this.lastTrackedUids.every((uid, i) => uid === toTrack[i])) {
			return;
		}

		this.lastTrackedUids = toTrack;

		// Спочатку відписуємося від попередніх фонових підписок
		this.backgroundUnsubscribers.forEach(unsub => unsub());
		this.backgroundUnsubscribers = [];

		if (this.isPaused) return;

		logService.log("presence", `Setting up background tracking for ${toTrack.length} friends (limit: ${limit})`);
		
		toTrack.forEach(uid => {
			this.backgroundUnsubscribers.push(this.trackFriendStatus(uid));
		});
	}

	/**
	 * Ініціалізація сервісу для конкретного користувача.
	 * Гарантує SSoT та запобігає повторним ініціалізаціям.
	 */
	async init(uid: string) {
		if (this.currentUid === uid && this.isInitialized) {
			logService.log("presence", "PresenceService already initialized for this user");
			return;
		}

		// Якщо UID змінився — спочатку очищуємо попередній стан
		if (this.currentUid && this.currentUid !== uid) {
			this.goOffline(this.currentUid);
		}

		this.currentUid = uid;
		this.isInitialized = true;
		logService.log("presence", "Initializing PresenceService for:", uid);
		
		// Налаштування відстеження видимості вкладки
		if (typeof document !== "undefined") {
			if (this.boundHandleVisibilityChange) {
				document.removeEventListener("visibilitychange", this.boundHandleVisibilityChange);
			}
			this.boundHandleVisibilityChange = () => this.handleVisibilityChange();
			document.addEventListener("visibilitychange", this.boundHandleVisibilityChange);
		}

		// Налаштування власного онлайн-статусу
		this.setupOwnStatus(uid);
		
		// Починаємо слухати вхідні сигнали
		this.listenForSignals(uid);
	}

	/**
	 * Налаштовує онлайн-статус користувача в RTDB
	 */
	private setupOwnStatus(uid: string) {
		const userStatusRef = ref(rtdb, `/status/${uid}`);
		const isOfflineForDatabase = { state: "offline", lastChanged: serverTimestamp() };
		const isOnlineForDatabase = { state: "online", lastChanged: serverTimestamp() };

		onDisconnect(userStatusRef).set(isOfflineForDatabase).then(() => {
			set(userStatusRef, isOnlineForDatabase)
				.then(() => logService.log("presence", "User status set to online"))
				.catch(err => logService.error("presence", "Failed to set online status", err));
		});
	}

	/**
	 * Слухає нові сигнали для користувача.
	 * Використовує серверний запит для отримання лише нових повідомлень.
	 */
	private listenForSignals(uid: string) {
		if (this.signalUnsubscribe) {
			this.signalUnsubscribe();
			this.signalUnsubscribe = null;
		}

		logService.log("interaction", "Setting up server-side signal listener for:", uid);
		
		// Фільтруємо на рівні сервера: тільки сигнали, створені після моменту підписки
		// Додаємо невеликий буфер (10 сек) для компенсації десинхронізації годинників
		const signalsQuery = query(
			ref(rtdb, `/signals/${uid}`),
			orderByChild("timestamp"),
			startAt(Date.now() - 10000)
		);

		this.signalUnsubscribe = onChildAdded(signalsQuery, async (snapshot) => {
			const signal = snapshot.val() as Signal;
			const signalKey = snapshot.key;

			if (!signal || !signalKey || this.processedSignals.has(signalKey)) return;

			this.processedSignals.add(signalKey);
			logService.log("interaction", `New signal [${signal.type}] from ${signal.fromUid}`);

			this.addInteraction({
				type: 'incoming_wave',
				uid: signal.fromUid,
				profile: { name: signal.fromName, photoURL: signal.fromPhoto }
			});

			// Видаляємо сигнал з бази після отримання (Consume pattern)
			try {
				await remove(ref(rtdb, `/signals/${uid}/${signalKey}`));
			} catch (e) {
				logService.error("interaction", "Failed to remove consumed signal", e);
			}
		});
	}

	/**
	 * Надсилає сигнал іншому користувачу.
	 * Використовує push() для унікальності та serverTimestamp для надійності.
	 */
	async sendWave(targetUid: string, senderProfile: { name: string; photoURL: string | null }, eventId?: string) {
		const currentUser = auth.currentUser;
		if (!currentUser) {
			logService.error("interaction", "Cannot send wave: No authenticated user found in Firebase Auth");
			return;
		}

		// Cooldown: 2 секунди для одного й того ж отримувача
		const now = Date.now();
		const lastSent = this.lastSignalSentAt.get(targetUid) || 0;
		if (now - lastSent < 2000) {
			logService.warn("interaction", "Wave throttled: too frequent for this user");
			return;
		}

		this.lastSignalSentAt.set(targetUid, now);
		logService.log("interaction", `Sending wave to: ${targetUid} from: ${currentUser.uid}`);

		const signalsRef = ref(rtdb, `/signals/${targetUid}`);
		
		// Використовуємо об'єкт для запису, де timestamp буде встановлено сервером
		const signalData = {
			type: "wave",
			fromUid: currentUser.uid,
			fromName: senderProfile.name,
			fromPhoto: senderProfile.photoURL,
			timestamp: serverTimestamp()
		};

		logService.log("interaction", "Signal payload (with serverTimestamp):", signalData);

		try {
			if (eventId) this.updateInteractionState(eventId, 'sent');
			
			const newSignalRef = push(signalsRef);
			await set(newSignalRef, signalData);
			
			logService.log("interaction", "Wave successfully sent");
		} catch (error) {
			logService.error("interaction", "Failed to send wave", error);
		}
	}

	/**
	 * Додає подію в чергу взаємодії (UDF)
	 */
	private addInteraction(event: Omit<InteractionEvent, 'id' | 'timestamp' | 'state'> & { id?: string, state?: InteractionEvent['state'] }) {
		const id = event.id || crypto.randomUUID();
		
		// Захист від дублювання (особливо для 'online' сповіщень)
		if (event.type === 'online') {
			const exists = this.interactions.some(i => i.uid === event.uid && i.type === 'online');
			if (exists) return;
		}

		const newEvent: InteractionEvent = {
			id,
			timestamp: Date.now(),
			state: event.state || (event.type === 'incoming_wave' || event.type === 'new_follower' ? 'expanded' : 'collapsed'),
			...event
		};

		this.interactions.push(newEvent);
	}

	/**
	 * Видаляє подію з черги (UDF)
	 */
	removeInteraction(id: string) {
		this.interactions = this.interactions.filter(i => i.id !== id);
	}

	/**
	 * Оновлює стан події (UDF)
	 */
	updateInteractionState(id: string, state: InteractionEvent['state']) {
		const event = this.interactions.find(i => i.id === id);
		if (event) event.state = state;
	}

	/**
	 * Обробка зміни видимості сторінки.
	 * Відновлює підписки тільки коли це необхідно.
	 */
	private handleVisibilityChange() {
		if (!this.currentUid) return;
		
		const isHidden = document.visibilityState === "hidden";
		if (isHidden === this.isPaused) return;
		
		this.isPaused = isHidden;
		logService.log("presence", `Visibility changed: ${isHidden ? "hidden" : "visible"}`);

		if (this.isPaused) {
			this.stopListeners();
		} else {
			this.resumeListeners();
		}
	}

	private stopListeners() {
		this.statusUnsubscribers.forEach(entry => entry.unsub());
		if (this.signalUnsubscribe) {
			this.signalUnsubscribe();
			this.signalUnsubscribe = null;
		}
		if (this.discoveryUnsubscribe) {
			this.discoveryUnsubscribe();
			this.discoveryUnsubscribe = null;
		}
	}

	private resumeListeners() {
		if (!this.currentUid) return;
		
		// Відновлюємо відстеження статусів друзів
		const uids = Array.from(this.statusUnsubscribers.keys());
		this.statusUnsubscribers.clear();
		uids.forEach(uid => this.trackFriendStatus(uid));
		
		// Відновлюємо сигнали
		this.listenForSignals(this.currentUid);
	}

	/**
	 * Перехід в офлайн та очищення ресурсів.
	 */
	goOffline(uid: string) {
		logService.log("presence", "Going offline for:", uid);
		
		if (typeof document !== "undefined" && this.boundHandleVisibilityChange) {
			document.removeEventListener("visibilitychange", this.boundHandleVisibilityChange);
			this.boundHandleVisibilityChange = null;
		}

		const userStatusRef = ref(rtdb, `/status/${uid}`);
		set(userStatusRef, { state: "offline", lastChanged: serverTimestamp() });
		
		this.stopListeners();
		this.statusUnsubscribers.clear();
		this.friendsStatus.clear();
		this.initialStatusLoaded.clear();
		this.interactions = [];
		this.processedSignals.clear();
		this.isInitialized = false;
		this.currentUid = null;
	}

	/**
	 * Discovery Mode (Активний пошук)
	 */
	async enterDiscoveryMode(profile: { displayName: string; photoURL: string | null }) {
		if (!this.currentUid) return;
		
		const discoveryRef = ref(rtdb, `/discovery/${this.currentUid}`);
		await onDisconnect(discoveryRef).remove();
		await set(discoveryRef, { ...profile, timestamp: serverTimestamp() });
		logService.log("presence", "Entered discovery mode");
	}

	async leaveDiscoveryMode() {
		if (!this.currentUid) return;
		const discoveryRef = ref(rtdb, `/discovery/${this.currentUid}`);
		await onDisconnect(discoveryRef).cancel();
		await remove(discoveryRef);
		logService.log("presence", "Left discovery mode");
	}

	subscribeToDiscovery(callback: (users: DiscoveryUser[]) => void): () => void {
		const discoveryListRef = query(ref(rtdb, 'discovery'), orderByChild('timestamp'), limitToLast(30));
		this.discoveryUnsubscribe = onValue(discoveryListRef, (snapshot) => {
			const users: DiscoveryUser[] = [];
			snapshot.forEach((child) => {
				if (child.key !== this.currentUid) {
					const val = child.val();
					users.push({ uid: child.key!, displayName: val.displayName, photoURL: val.photoURL, timestamp: val.timestamp });
				}
			});
			callback(users.reverse());
		});
		return () => {
			if (this.discoveryUnsubscribe) {
				this.discoveryUnsubscribe();
				this.discoveryUnsubscribe = null;
			}
		};
	}

	/**
	 * Відстеження статусу друзів
	 */
	trackFriendStatus(uid: string): () => void {
		if (uid === this.currentUid) return () => {};

		const existing = this.statusUnsubscribers.get(uid);
		if (existing) {
			existing.count++;
			return () => this.untrackFriendStatus(uid);
		}

		const statusRef = ref(rtdb, `/status/${uid}`);
		const unsub = onValue(statusRef, (snapshot) => {
			const data = snapshot.val() as UserStatus | null;
			if (!data) return;

			const prev = this.friendsStatus.get(uid);
			if (prev?.state === data.state) return;

			// Сповіщення про вхід в онлайн
			if (data.state === "online") {
				const isNew = !prev || prev.state !== "online";
				const isRecent = (Date.now() - (data.lastChanged as number)) < 15000;
				if (isNew && (this.initialStatusLoaded.has(uid) || isRecent)) {
					this.handleFriendOnline(uid);
				}
			}
			
			this.friendsStatus.set(uid, data);
			this.initialStatusLoaded.add(uid);
		});

		this.statusUnsubscribers.set(uid, { unsub, count: 1 });
		return () => this.untrackFriendStatus(uid);
	}

	private async handleFriendOnline(uid: string) {
		const { friendsStore } = await import("../stores/friendsStore.svelte");
		const profile = await friendsStore.getProfile(uid);
		if (profile) {
			this.addInteraction({
				type: 'online',
				uid,
				profile: { name: profile.displayName, photoURL: profile.photoURL }
			});
		}
	}

	private untrackFriendStatus(uid: string) {
		const entry = this.statusUnsubscribers.get(uid);
		if (entry) {
			entry.count--;
			if (entry.count <= 0) {
				entry.unsub();
				this.statusUnsubscribers.delete(uid);
			}
		}
	}

	/**
	 * Перевірити, чи користувач онлайн (SSoT з friendsStatus map)
	 */
	isOnline(uid: string): boolean {
		return this.friendsStatus.get(uid)?.state === "online";
	}

	/**
	 * API для відкриття меню вручну
	 */
	openInteractionMenu(uid: string, profile: { name: string; photoURL: string | null }) {
		const id = `manual_menu-${uid}`;
		this.addInteraction({ id, type: 'manual_menu', uid, profile, state: 'collapsed' });
		setTimeout(() => this.updateInteractionState(id, 'expanded'), 50);
	}

	addFollowerNotification(uid: string, profile: { name: string; photoURL: string | null }) {
		this.addInteraction({ type: 'new_follower', uid, profile });
	}
}

export const PresenceService = new PresenceServiceClass();