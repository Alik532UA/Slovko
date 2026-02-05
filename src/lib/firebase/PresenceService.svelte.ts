import { ref, onValue, set, onDisconnect, serverTimestamp, onChildAdded, remove, type Unsubscribe } from "firebase/database";
import { rtdb, auth } from "./config";
import { logService } from "../services/logService";

export type OnlineStatus = "online" | "offline";

export interface UserStatus {
	state: OnlineStatus;
	lastChanged: number;
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
	type: 'online' | 'incoming_wave' | 'manual_menu';
	uid: string;
	profile: { name: string; photoURL: string | null };
	timestamp: number;
	state: 'collapsed' | 'expanded' | 'sent';
}

/**
 * PresenceService — сервіс для відстеження онлайн-статусу та обміну сигналами.
 */
class PresenceServiceClass {
	// Реактивна карта статусів: [uid] -> UserStatus
	friendsStatus = $state<Record<string, UserStatus>>({});
	
	// Черга активних подій взаємодії
	interactions = $state<InteractionEvent[]>([]);
	
	private statusUnsubscribers: Map<string, { unsub: Unsubscribe, count: number }> = new Map();
	private signalUnsubscribe: Unsubscribe | null = null;
	private lastWaveSentAt: number = 0;
	private lastSignalSentAt: number = 0;
	private processedSignals: Set<string> = new Set();
		private isPaused = false;
		private currentUid: string | null = null;
		private initialStatusLoaded: Set<string> = new Set();
		private boundHandleVisibilityChange: (() => void) | null = null;
		private backgroundUnsubscribers: (() => void)[] = [];
	
		/**
		 * Налаштовує фонове відстеження статусів для обмеженої кількості друзів.
		 * Це потрібно для роботи сповіщень про вхід друзів в онлайн.
		 */
		limitBackgroundTracking(uids: string[], limit = 20) {
			// Спочатку відписуємося від попередніх фонових підписок
			this.backgroundUnsubscribers.forEach(unsub => unsub());
			this.backgroundUnsubscribers = [];
	
			if (this.isPaused) return;
	
			// Відстежуємо лише перші N друзів (найактивніші/взаємні)
			const toTrack = uids.slice(0, limit);
			logService.log("presence", `Setting up background tracking for ${toTrack.length} friends (limit: ${limit})`);
			
			toTrack.forEach(uid => {
				this.backgroundUnsubscribers.push(this.trackFriendStatus(uid));
			});
		}
	
		/**
		 * Додає подію в чергу	 */
	private addInteraction(event: Omit<InteractionEvent, 'id' | 'timestamp' | 'state'> & { state?: InteractionEvent['state'] }) {
		// Захист від дублювання: не додаємо 'online', якщо він вже є для цього юзера
		if (event.type === 'online') {
			const exists = this.interactions.some(i => i.uid === event.uid && i.type === 'online');
			if (exists) return;
		}

		// Використовуємо надійний UUID
		const id = crypto.randomUUID();
		
		const newEvent: InteractionEvent = {
			id,
			timestamp: Date.now(),
			state: event.state || (event.type === 'incoming_wave' ? 'expanded' : 'collapsed'),
			...event
		};

		this.interactions.push(newEvent);
	}

	/**
	 * Видаляє подію з черги
	 */
	removeInteraction(id: string) {
		this.interactions = this.interactions.filter(i => i.id !== id);
	}

	/**
	 * Оновлює стан події
	 */
	updateInteractionState(id: string, state: InteractionEvent['state']) {
		const event = this.interactions.find(i => i.id === id);
		if (event) event.state = state;
	}

	/**
	 * Встановлює статус користувача "online" та налаштовує автоматичний перехід в "offline".
	 */
	async init(uid: string) {
		if (this.currentUid === uid && this.signalUnsubscribe) {
			logService.log("presence", "PresenceService already initialized for this user, skipping.");
			return;
		}

		this.currentUid = uid;
		logService.log("presence", "Initializing PresenceService for:", uid);
		
		if (typeof document !== "undefined") {
			if (this.boundHandleVisibilityChange) {
				document.removeEventListener("visibilitychange", this.boundHandleVisibilityChange);
			}
			this.boundHandleVisibilityChange = () => this.handleVisibilityChange();
			document.addEventListener("visibilitychange", this.boundHandleVisibilityChange);
		}

		const userStatusRef = ref(rtdb, `/status/${uid}`);

		const isOfflineForDatabase = {
			state: "offline",
			lastChanged: serverTimestamp(),
		};

		const isOnlineForDatabase = {
			state: "online",
			lastChanged: serverTimestamp(),
		};

		// При втраті зв'язку (закриття вкладки) — ставимо offline
		onDisconnect(userStatusRef).set(isOfflineForDatabase).then(() => {
			logService.log("presence", "Presence onDisconnect hook set for:", uid);
			// Встановлюємо online зараз
			set(userStatusRef, isOnlineForDatabase).then(() => {
				logService.log("presence", "User status set to online:", uid);
			}).catch(err => {
				logService.error("presence", "Failed to set user status to online:", err);
			});
		}).catch(err => {
			logService.error("presence", "Failed to set onDisconnect hook:", err);
		});

		this.listenForSignals(uid);
	}

	/**
	 * Обробка зміни видимості сторінки (Tab focus/blur)
	 */
	private handleVisibilityChange() {
		if (!this.currentUid) return;
		
		const isHidden = document.visibilityState === "hidden";
		if (isHidden === this.isPaused) return;
		
		this.isPaused = isHidden;
		logService.log("presence", `App visibility changed: ${isHidden ? "hidden" : "visible"}. Pausing RTDB listeners: ${isHidden}`);

		if (this.isPaused) {
			// Призупиняємо підписки на друзів та сигнали (але не власний статус!)
			this.statusUnsubscribers.forEach(entry => entry.unsub());
			if (this.signalUnsubscribe) {
				this.signalUnsubscribe();
				this.signalUnsubscribe = null;
			}
		} else {
			// Відновлюємо підписки
			const uidsToTrack = Array.from(this.statusUnsubscribers.keys());
			this.statusUnsubscribers.clear(); // Очищуємо карту, щоб trackFriendStatus створив нові
			uidsToTrack.forEach(uid => this.trackFriendStatus(uid));
			this.listenForSignals(this.currentUid);
		}
	}

	/**
	 * Слухає нові сигнали для користувача
	 */
	private listenForSignals(uid: string) {
		logService.log("interaction", "Listening for signals at:", `/signals/${uid}`);
		const signalsRef = ref(rtdb, `/signals/${uid}`);
		
		// Використовуємо onChildAdded, щоб ловити кожен новий сигнал
		this.signalUnsubscribe = onChildAdded(signalsRef, async (snapshot) => {
			if (!auth.currentUser || auth.currentUser.uid !== uid) return;
			
			const signal = snapshot.val() as Signal;
			const signalKey = snapshot.key;

			if (!signal || !signalKey || this.processedSignals.has(signalKey)) {
				return;
			}

			// Маркуємо як оброблений негайно, щоб запобігти повторним спробам
			this.processedSignals.add(signalKey);

			// Впроваджуємо TTL для ключа (1 хвилина), щоб запобігти витоку пам'яті (VULN_02)
			setTimeout(() => {
				this.processedSignals.delete(signalKey);
			}, 60000);

			// Захист від спаму: не обробляємо більше 10 активних сигналів одночасно
			if (this.interactions.length > 10) {
				logService.warn("interaction", "High volume of incoming signals detected, throttling...");
				return;
			}

			logService.log("interaction", "Received signal snapshot:", signalKey, signal);

			if (signal && signalKey) {
				const age = Date.now() - signal.timestamp;
				logService.log("interaction", `Signal age: ${age}ms`);

				// Ігноруємо старі сигнали (старше 30 секунд)
				if (age < 30000) {
					logService.log("interaction", "Signal is fresh, adding to interactions queue");
					this.addInteraction({
						type: 'incoming_wave',
						uid: signal.fromUid,
						profile: { name: signal.fromName, photoURL: signal.fromPhoto }
					});
				} else {
					logService.log("interaction", "Signal is too old, ignoring");
				}
				
				// Одразу видаляємо сигнал з бази, щоб не накопичувалися
				if (auth.currentUser && auth.currentUser.uid === uid) {
					logService.log("interaction", "Removing processed signal:", signalKey);
					try {
						await remove(ref(rtdb, `/signals/${uid}/${signalKey}`));
					} catch (e) {
						logService.error("interaction", "Failed to remove processed signal:", e);
						// Ми НЕ видаляємо з processedSignals тут, щоб не пробувати знову
					}
				}
			}
		}, (error) => {
			logService.error("interaction", "Error listening for signals:", error);
		});
	}

	/**
	 * Внутрішній метод для відправки сигналів з підтримкою різних лімітів (cooldown)
	 */
	private async sendSignalInternal(
		targetUid: string, 
		type: Signal["type"], 
		senderProfile: { name: string; photoURL: string | null },
		cooldown: number,
		lastSentTimestampKey: "lastWaveSentAt" | "lastSignalSentAt",
		eventId?: string // Опціональний ID події для оновлення стану
	) {
		if (!auth.currentUser) {
			logService.error("interaction", `Cannot send ${type}: No current user`);
			return;
		}

		const now = Date.now();
		if (now - this[lastSentTimestampKey] < cooldown) {
			logService.warn("interaction", `${type} throttled (${cooldown}ms cooldown)`);
			return;
		}
		
		logService.log("interaction", `Attempting to send ${type} to:`, targetUid);
		this[lastSentTimestampKey] = now;

		const signalRef = ref(rtdb, `/signals/${targetUid}/${auth.currentUser.uid}`);
		const newSignal: Signal = {
			type,
			fromUid: auth.currentUser.uid,
			fromName: senderProfile.name,
			fromPhoto: senderProfile.photoURL,
			timestamp: now
		};

		try {
			// Оновлюємо стан конкретної капсули, якщо ID надано
			if (eventId) {
				this.updateInteractionState(eventId, 'sent');
			}

			await set(signalRef, newSignal);
			logService.log("interaction", `${type} successfully sent to:`, targetUid);
		} catch (error) {
			logService.error("interaction", `Failed to send ${type}:`, error);
		}
	}

	/**
	 * Надсилає "привіт" (Wave) іншому користувачу.
	 */
	async sendWave(targetUid: string, senderProfile: { name: string; photoURL: string | null }, eventId?: string) {
		return this.sendSignalInternal(targetUid, "wave", senderProfile, 100, "lastWaveSentAt", eventId);
	}

	/**
	 * Зупиняє відстеження та очищує ресурси
	 */
		goOffline(uid: string) {
			if (typeof document !== "undefined" && this.boundHandleVisibilityChange) {
				document.removeEventListener("visibilitychange", this.boundHandleVisibilityChange);
				this.boundHandleVisibilityChange = null;
			}

			const userStatusRef = ref(rtdb, `/status/${uid}`);
			set(userStatusRef, {
				state: "offline",
				lastChanged: Date.now(),
			});
			
			// Відписуємося від усіх статусів
			this.statusUnsubscribers.forEach(entry => entry.unsub());
			this.statusUnsubscribers.clear();
			this.friendsStatus = {};
			this.initialStatusLoaded.clear();
			this.interactions = [];
		// Відписуємося від сигналів
		if (this.signalUnsubscribe) {
			this.signalUnsubscribe();
			this.signalUnsubscribe = null;
		}
		this.processedSignals.clear();
		this.currentUid = null;
	}

	/**
	 * Підписатися на статус конкретного користувача (друга)
	 * Повертає функцію для відписки
	 */
	trackFriendStatus(uid: string): () => void {
		const existing = this.statusUnsubscribers.get(uid);
		if (existing) {
			existing.count++;
			return () => this.untrackFriendStatus(uid);
		}

		logService.log("presence", "Starting to track friend status for:", uid);
		const statusRef = ref(rtdb, `/status/${uid}`);
		const unsub = onValue(statusRef, (snapshot) => {
			const data = snapshot.val() as UserStatus | null;
			logService.log("presence", `Status update for ${uid}:`, data);
			
			const prevStatus = this.friendsStatus[uid];
			
			if (data) {
				// Логіка сповіщення про вхід в онлайн
				if (data.state === "online") {
					const isNewOnline = !prevStatus || prevStatus.state !== "online";
					const isRecent = data.lastChanged && (Date.now() - (data.lastChanged as number)) < 15000;
					
					// Якщо ми вже завантажили початковий статус і це новий вхід,
					// АБО якщо ми тільки завантажили і статус зовсім свіжий (< 15 сек)
					if (isNewOnline && (this.initialStatusLoaded.has(uid) || isRecent)) {
						this.handleFriendOnline(uid);
					}
				}
				
				this.friendsStatus[uid] = data;
				this.initialStatusLoaded.add(uid);
			}
		}, (error) => {
			logService.error("presence", `Error tracking status for ${uid}:`, error);
		});

		this.statusUnsubscribers.set(uid, { unsub, count: 1 });
		return () => this.untrackFriendStatus(uid);
	}

	/**
	 * Обробка входу друга в онлайн
	 */
	private async handleFriendOnline(uid: string) {
		// Ми не хочемо показувати сповіщення про себе (хоча ми і не трекаємо себе зазвичай)
		if (uid === this.currentUid) return;

		// Отримуємо профіль друга з стору
		const { friendsStore } = await import("../stores/friendsStore.svelte");
		const profile = await friendsStore.getProfile(uid);
		
		if (profile) {
			logService.log("presence", `Friend went online: ${profile.displayName}`);
			this.addInteraction({
				type: 'online',
				uid: profile.uid,
				profile: { name: profile.displayName, photoURL: profile.photoURL },
				state: 'collapsed'
			});
		}
	}

	/**
	 * Скидає стан сповіщення про онлайн
	 */
	clearFriendOnline() {
		this.interactions = this.interactions.filter(i => i.type !== 'online');
	}

	/**
	 * Зменшує кількість посилань на підписку. 
	 * Коли посилань 0 — реально відписується від Realtime Database.
	 */
	private untrackFriendStatus(uid: string) {
		const entry = this.statusUnsubscribers.get(uid);
		if (!entry) return;

		entry.count--;
		if (entry.count <= 0) {
			logService.log("presence", "Stopping tracking status for (no more listeners):", uid);
			entry.unsub();
			this.statusUnsubscribers.delete(uid);
			// Ми НЕ видаляємо initialStatusLoaded та friendsStatus тут, 
			// щоб при повторній підписці (наприклад, через ліміт) ми знали попередній стан
		}
	}

	/**
	 * Перевірити, чи користувач онлайн
	 */
	isOnline(uid: string): boolean {
		return this.friendsStatus[uid]?.state === "online";
	}
	
	/**
	 * Відкриває меню взаємодії
	 */
	openInteractionMenu(uid: string, profile: { name: string; photoURL: string | null }, _position = { x: 0, y: 0 }) {
		logService.log("interaction", `Opening interaction menu for: ${uid}`, profile);
		this.addInteraction({
			type: 'manual_menu',
			uid,
			profile,
			state: 'collapsed' // Початковий стан - тільки аватарка
		});
		
		// Одразу розгортаємо її
		setTimeout(() => {
			this.updateInteractionState(`manual_menu-${uid}`, 'expanded');
		}, 50);
	}

	/**
	 * Закриває меню взаємодії
	 */
	closeInteractionMenu() {
		logService.log("interaction", "Closing interaction menus");
		this.interactions = this.interactions.filter(i => i.type !== 'manual_menu');
	}
	
	/**
	 * Скидає останній сигнал (після показу)
	 */
	clearSignal() {
		this.interactions = this.interactions.filter(i => i.type !== 'incoming_wave');
	}
}

export const PresenceService = new PresenceServiceClass();
