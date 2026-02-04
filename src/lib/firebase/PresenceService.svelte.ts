import { ref, onValue, set, onDisconnect, push, serverTimestamp, type Unsubscribe } from "firebase/database";
import { rtdb, auth } from "./config";
import { logService } from "../services/logService";

export type OnlineStatus = "online" | "offline";

export interface UserStatus {
	state: OnlineStatus;
	lastChanged: number;
}

/**
 * PresenceService — сервіс для відстеження онлайн-статусу та обміну сигналами.
 */
class PresenceServiceClass {
	// Реактивна карта статусів: [uid] -> UserStatus
	friendsStatus = $state<Record<string, UserStatus>>({});
	
	private statusUnsubscribers: Map<string, Unsubscribe> = new Map();

	/**
	 * Встановлює статус користувача "online" та налаштовує автоматичний перехід в "offline".
	 */
	async init(uid: string) {
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
			// Встановлюємо online зараз
			set(userStatusRef, isOnlineForDatabase);
		});

		logService.log("sync", "Presence tracking started for:", uid);
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
		
		// Відписуємося від усіх друзів
		this.statusUnsubscribers.forEach(unsub => unsub());
		this.statusUnsubscribers.clear();
		this.friendsStatus = {};
	}

	/**
	 * Підписатися на статус конкретного користувача (друга)
	 */
	trackFriendStatus(uid: string) {
		if (this.statusUnsubscribers.has(uid)) return;

		const statusRef = ref(rtdb, `/status/${uid}`);
		const unsub = onValue(statusRef, (snapshot) => {
			const data = snapshot.val();
			if (data) {
				this.friendsStatus[uid] = data;
			}
		});

		this.statusUnsubscribers.set(uid, unsub);
	}

	/**
	 * Перевірити, чи користувач онлайн
	 */
	isOnline(uid: string): boolean {
		return this.friendsStatus[uid]?.state === "online";
	}
}

export const PresenceService = new PresenceServiceClass();
