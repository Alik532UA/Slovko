import { ref, onValue, set, onDisconnect, push, serverTimestamp, onChildAdded, remove, type Unsubscribe } from "firebase/database";
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

/**
 * PresenceService — сервіс для відстеження онлайн-статусу та обміну сигналами.
 */
class PresenceServiceClass {
	// Реактивна карта статусів: [uid] -> UserStatus
	friendsStatus = $state<Record<string, UserStatus>>({});
	// Останній отриманий сигнал
	latestSignal = $state<Signal | null>(null);
	
	// Стан для меню взаємодії
	activeTargetUid = $state<string | null>(null);
	activeTargetProfile = $state<{ name: string; photoURL: string | null } | null>(null);
	
	private statusUnsubscribers: Map<string, { unsub: Unsubscribe, count: number }> = new Map();
	private signalUnsubscribe: Unsubscribe | null = null;
	private lastWaveSentAt: number = 0;
	private processedSignals: Set<string> = new Set();
	private isPaused = false;
	private currentUid: string | null = null;

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
			document.addEventListener("visibilitychange", () => this.handleVisibilityChange());
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

			// Захист від спаму: не обробляємо більше 5 нових сигналів одночасно
			if (this.latestSignal && !this.processedSignals.has(this.latestSignal.id || "")) {
				// Якщо у нас вже є активний сигнал, який ще не показаний, ігноруємо надлишок
				if (this.processedSignals.size % 10 === 0) {
					logService.warn("interaction", "High volume of incoming signals detected, throttling...");
				}
			}

			logService.log("interaction", "Received signal snapshot:", signalKey, signal);

			if (signal && signalKey) {
				const age = Date.now() - signal.timestamp;
				logService.log("interaction", `Signal age: ${age}ms`);

				// Ігноруємо старі сигнали (старше 30 секунд)
				if (age < 30000) {
					logService.log("interaction", "Signal is fresh, setting latestSignal");
					this.latestSignal = { ...signal, id: signalKey };
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
	 * Надсилає "привіт" (Wave) іншому користувачу
	 */
	async sendWave(targetUid: string, senderProfile: { name: string; photoURL: string | null }) {
		if (!auth.currentUser) {
			logService.error("interaction", "Cannot send wave: No current user");
			return;
		}

		// Обмеження: не частіше ніж кожні 5 секунд
		const now = Date.now();
		if (now - this.lastWaveSentAt < 5000) {
			logService.warn("interaction", "Wave throttled (5s cooldown)");
			return;
		}
		
		logService.log("interaction", "Attempting to send wave to:", targetUid);
		this.lastWaveSentAt = now;

		const signalsRef = ref(rtdb, `/signals/${targetUid}`);
		const newSignal: Signal = {
			type: "wave",
			fromUid: auth.currentUser.uid,
			fromName: senderProfile.name,
			fromPhoto: senderProfile.photoURL,
			timestamp: Date.now()
		};

		try {
			await push(signalsRef, newSignal);
			logService.log("interaction", "Wave successfully sent to:", targetUid);
		} catch (error) {
			logService.error("interaction", "Failed to send wave:", error);
		}
	}

	/**
	 * Зупиняє відстеження (при логауті)
	 */
		goOffline(uid: string) {
			const userStatusRef = ref(rtdb, `/status/${uid}`);
			set(userStatusRef, {
				state: "offline",
				lastChanged: Date.now(),
			});
			
			// Відписуємося від усіх статусів
			this.statusUnsubscribers.forEach(entry => entry.unsub());
			this.statusUnsubscribers.clear();
			this.friendsStatus = {};
		// Відписуємося від сигналів
		if (this.signalUnsubscribe) {
			this.signalUnsubscribe();
			this.signalUnsubscribe = null;
		}
		this.processedSignals.clear();
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
			const data = snapshot.val();
			logService.log("presence", `Status update for ${uid}:`, data);
			if (data) {
				this.friendsStatus[uid] = data;
			}
		}, (error) => {
			logService.error("presence", `Error tracking status for ${uid}:`, error);
		});

		this.statusUnsubscribers.set(uid, { unsub, count: 1 });
		return () => this.untrackFriendStatus(uid);
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
			// Очищаємо статус, щоб не тримати застарілі дані
			delete this.friendsStatus[uid];
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
	openInteractionMenu(uid: string, profile: { name: string; photoURL: string | null }) {
		this.activeTargetUid = uid;
		this.activeTargetProfile = profile;
	}

	/**
	 * Закриває меню взаємодії
	 */
	closeInteractionMenu() {
		this.activeTargetUid = null;
		this.activeTargetProfile = null;
	}
	
	/**
	 * Скидає останній сигнал (після показу)
	 */
	clearSignal() {
		this.latestSignal = null;
	}
}

export const PresenceService = new PresenceServiceClass();
