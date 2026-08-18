import {
	announceOnline,
	dropSignal,
	enterDiscovery,
	leaveDiscovery,
	sendSignal,
	watchDiscovery,
	watchInbox,
	watchStatus
} from "./presenceRtdb";
// Імпорт ТИПУ, а не значення: він зникає при компіляції, тож мережі в модуль не
// приносить — саме тому інваріант § 10.4 його й не рахує.
import type { Unsubscribe } from "firebase/database";
import { getAuthInstance } from "./config";

/*
 * Лінивий акцесор до Auth.
 *
 * SDK піднімається при ПЕРШОМУ зверненні, а не на імпорті цього модуля: інакше
 * будь-який тест, що транзитивно тягне файл, вимагав би бойових ключів, щоб
 * узагалі зібратися (CLOUD-DATABASE-v8 § 10.1).
 *
 * Акцесора до RTDB тут більше немає: усі звернення до бази пішли в чистий
 * `presenceRtdb.ts` — межа `.svelte.ts` більше не проходить крізь мережу
 * (§ 10.4). Вікно підписки на сигнали живе там само.
 */
const auth = () => getAuthInstance();

import { logService } from "../../services/logService.svelte";

export type OnlineStatus = "online" | "offline";

export interface UserStatus {
	state: OnlineStatus;
	/**
	 * Серверна позначка часу. Необовʼязкова, бо запис у базі може її не мати:
	 * правило вимагає лише `state`, а `onDisconnect` ставить обидва поля.
	 */
	lastChanged?: number;
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
	type:
		| "online"
		| "incoming_wave"
		| "manual_menu"
		| "new_follower"
		| "daily_goal_reached"
		| "leader_gap_reached"
		| "leader_overtaken";
	uid: string;
	profile: { name: string; photoURL: string | null };
	timestamp: number;
	state: "collapsed" | "expanded" | "sent";
	streak?: number;
	gap?: number;
}

/**
 * PresenceService — сервіс для відстеження онлайн-статусу та обміну сигналами.
 * 
 * Архітектурні принципи:
 * 1. SSoT: Єдине джерело статусів та подій взаємодії.
 * 2. UDF: Події додаються через addInteraction, видаляються через removeInteraction.
 * 3. Надійність: слот на відправника в скриньці сигналів та serverTimestamp
 *    для фільтрації.
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
		announceOnline(uid)
			.then(() => logService.log("presence", "User status set to online"))
			.catch((err) => logService.error("presence", "Failed to set online status", err));
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

		this.signalUnsubscribe = watchInbox(uid, async (slot, signal) => {
			/*
			 * Ключ дедуплікації несе ЧАС, а не лише ключ вузла.
			 *
			 * Ключ вузла дорівнює uid відправника й тому повторюється: без часу другий
			 * сигнал від тієї самої людини за сесію вважався б уже обробленим і не
			 * показався б.
			 */
			const seenKey = `${slot}:${signal.timestamp ?? 0}`;
			if (this.processedSignals.has(seenKey)) return;

			this.processedSignals.add(seenKey);
			logService.log("interaction", `New signal [${signal.type}] from ${signal.fromUid}`);

			this.addInteraction({
				type: 'incoming_wave',
				uid: signal.fromUid,
				profile: { name: signal.fromName, photoURL: signal.fromPhoto ?? null }
			});

			// Прибираємо оброблений сигнал зі своєї скриньки (consume pattern).
			try {
				await dropSignal(uid, slot);
			} catch (e) {
				logService.error("interaction", "Failed to remove consumed signal", e);
			}
		});
	}

	/**
	 * Надсилає сигнал іншому користувачу.
	 * Ключ у скриньці — uid відправника: один слот на людину (§ 12.1).
	 */
	async sendWave(targetUid: string, senderProfile: { name: string; photoURL: string | null }, eventId?: string) {
		const currentUser = auth().currentUser;
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

		try {
			if (eventId) this.updateInteractionState(eventId, 'sent');
			await sendSignal(targetUid, currentUser.uid, {
				type: "wave",
				fromName: senderProfile.name,
				fromPhoto: senderProfile.photoURL
			});
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

		this.stopListeners();
		this.statusUnsubscribers.clear();
		this.friendsStatus.clear();
		this.initialStatusLoaded.clear();
		this.interactions = [];
		this.processedSignals.clear();
		this.lastSignalSentAt.clear();
		this.lastTrackedUids = [];
		this.isInitialized = false;
		this.currentUid = null;
	}

	/**
	 * Discovery Mode (Активний пошук)
	 */
	async enterDiscoveryMode(profile: { displayName: string; photoURL: string | null }) {
		if (!this.currentUid) return;

		await enterDiscovery(this.currentUid, profile);
		logService.log("presence", "Entered discovery mode");
	}

	async leaveDiscoveryMode() {
		if (!this.currentUid) return;
		await leaveDiscovery(this.currentUid);
		logService.log("presence", "Left discovery mode");
	}

	subscribeToDiscovery(callback: (users: DiscoveryUser[]) => void): () => void {
		this.discoveryUnsubscribe = watchDiscovery(this.currentUid, callback);
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
		if (uid === this.currentUid) return () => { };

		const existing = this.statusUnsubscribers.get(uid);
		if (existing) {
			existing.count++;
			return () => this.untrackFriendStatus(uid);
		}

		const unsub = watchStatus(uid, (data) => {
			const prev = this.friendsStatus.get(uid);
			if (prev?.state === data.state) return;

			// Сповіщення про вхід в онлайн
			if (data.state === "online") {
				const isNew = !prev || prev.state !== "online";
				const now = Date.now();
				const lastChanged = (data.lastChanged as number) || 0;
				const isRecent = (now - lastChanged) < 10000;

				// Ми показуємо сповіщення ТІЛЬКИ якщо:
				// 1. Статус змінився на 'online' (isNew)
				// 2. Ми вже завантажили початковий статус цього користувача раніше (initialStatusLoaded)
				// 3. Зміна відбулася не раніше ніж 10 секунд тому (isRecent)
				if (isNew && this.initialStatusLoaded.has(uid) && isRecent) {
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
		const { friendsStore } = await import("../../controllers/FriendsStore.svelte");
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

	/**
	 * Сповіщення про досягнення денної цілі (власне)
	 */
	addDailyGoalNotification(streak: number) {
		const user = auth().currentUser;

		this.addInteraction({
			type: 'daily_goal_reached',
			uid: user ? user.uid : 'local_goal',
			profile: {
				name: "",
				photoURL: user ? user.photoURL : null
			},
			state: 'expanded', // Відразу розгорнуте
			streak
		});
	}
}

export const PresenceService = new PresenceServiceClass();