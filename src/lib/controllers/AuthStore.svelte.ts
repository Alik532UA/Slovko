import { logService } from "../services/logService.svelte";
import { AuthService } from "../services/firebase/AuthService";
import { SyncService } from "../services/firebase/SyncService.svelte";
import { PresenceService } from "../services/firebase/PresenceService.svelte";
import { FriendsService } from "../services/firebase/FriendsService";
import { friendsStore } from "./FriendsStore.svelte";
import { statisticsState } from "./StatisticsState.svelte";
import { notificationStore } from "./NotificationStore.svelte";
import { settingsStore } from "./SettingsStore.svelte";
import { localStorageProvider } from "../services/storage/storageProvider";
import type { User } from "firebase/auth";
import { browser } from "$app/environment";

/**
 * Інтерфейс для серіалізованого стану користувача
 * SSoT: Зберігаємо тільки необхідні дані, не весь Firebase User об'єкт
 */
interface AuthState {
	uid: string | null;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
	originalPhotoURL: string | null;
	isAnonymous: boolean;
	isGuest: boolean;
	providerId: string | null;
}

/**
 * Створює серіалізований стан з Firebase User
 */
function serializeUser(user: User | null): AuthState {
	if (!user) {
		return {
			uid: null,
			email: null,
			displayName: null,
			photoURL: null,
			originalPhotoURL: null,
			isAnonymous: false,
			isGuest: true,
			providerId: null,
		};
	}

	const googleProvider = user.providerData.find(
		(p) => p.providerId === "google.com",
	);

	return {
		uid: user.uid,
		email: user.email,
		displayName: user.displayName,
		photoURL: user.photoURL,
		originalPhotoURL: googleProvider?.photoURL || null,
		isAnonymous: user.isAnonymous,
		isGuest: user.isAnonymous,
		providerId: user.providerData[0]?.providerId || null,
	};
}

/**
 * ІМ'Я ГОСТЯ ЖИВЕ ЛОКАЛЬНО, окремим ключем.
 *
 * Гість без акаунта міняв собі ім'я «успішно»: поле вводу відкривалося, ім'я
 * друкувалося, «зберегти» закривало поле — і в заголовку лишалося старе
 * значення. Причина рівно в `updateProfile()` нижче: `if (!this.firebaseUser)
 * return`. А анонімного сеансу застосунок сам не створює — `signInAnonymously`
 * кличе рівно один `FeedbackService`, тобто анонім є лише в того, хто хоч раз
 * надіслав відгук. У решти `firebaseUser` — `null`, і введене зникало.
 *
 * Чому ОКРЕМИЙ ключ, а не поле в налаштуваннях: `AppSettings` синхронізуються в
 * хмару (`SyncService.mergeSettings`), тож гостьове ім'я поїхало б в акаунт саме
 * собою — і сперечалося б там із іменем акаунта. Тут воно нікуди не їде, поки
 * його не віддасть `claimGuestName()` при реєстрації.
 */
const GUEST_NAME_KEY = "guestName";

/**
 * AuthStore - керування станом автентифікації.
 */
class AuthStore {
	private _state = $state<AuthState>(serializeUser(null));
	private _isInitialized = $state(false);
	private firebaseUser: User | null = null;
	/** Ім'я, яке гість дав собі до будь-якого акаунта. */
	private _guestName = $state<string | null>(null);

	constructor() {
		/*
		 * Тільки в браузері. Підписка на стан автентифікації — це мережа, і на
		 * сервері вона не має сенсу: сеанс живе в браузері відвідувача
		 * (CLOUD-DATABASE-v8 § 10.1 — SDK не піднімається сам собою).
		 *
		 * Ціна відсутності цієї умови була не теоретична. Доки в проєкті була
		 * одна сторінка з `ssr = false`, конструктор на сервері не виконувався
		 * ніколи. Щойно з'явилася сторінка з увімкненим SSR, підписка
		 * спрацювала в Node, `updateState` покликав `FriendsService.clearCache()`
		 * — а той у серверному графі модулів на той момент ще `undefined`, бо
		 * імпорти замкнені в коло. Процес падав із `TypeError`, і виглядало це
		 * як обрив з'єднання: сторінка не віддавалася зовсім.
		 */
		if (!browser) return;

		// Гідрація — у конструкторі, запис — у мутаторі (SVELTE-CORE-v8 § 1.9).
		this._guestName = localStorageProvider.getItem(GUEST_NAME_KEY);

		AuthService.init((user) => {
			logService.log("debug", "[AuthStore] onAuthStateChanged:", {
				uid: user?.uid,
				isAnonymous: user?.isAnonymous,
			});
			this.updateState(user);
			this._isInitialized = true;
		});
	}

	get user() { return this._state; }
	get isInitialized() { return this._isInitialized; }
	get isDataReady() {
		return this._isInitialized && (this._state.isGuest || SyncService.hasInitialData);
	}
	get isAnonymous() { return this._state.isAnonymous; }
	get isGuest() { return this._state.isGuest; }
	get uid() { return this._state.uid; }
	get email() { return this._state.email; }
	/**
	 * Ім'я акаунта, а для гостя — те, яке він дав собі сам.
	 *
	 * Локальне ім'я підставляється ЛИШЕ гостю (`isGuest` покриває і анонімний
	 * вхід, і повну відсутність сеансу). Для акаунта без імені запасним
	 * лишається початок пошти, як і було: чуже локальне ім'я на акаунті
	 * виглядало б так, ніби акаунт назвали за спиною власника.
	 */
	get displayName() {
		return (
			this._state.displayName || (this._state.isGuest ? this._guestName : null)
		);
	}
	get photoURL() { return this._state.photoURL; }
	get originalPhotoURL() { return this._state.originalPhotoURL; }
	/**
	 * Вхід керується Google, тобто пароля в Slovko немає.
	 *
	 * Від цього залежать обидві форми безпеки: змінювати нема чого, а для
	 * видалення потрібна повторна автентифікація вікном Google, а не полем
	 * пароля (`AuthService.deleteAccount` розгалужується так само).
	 */
	get isGoogleAccount() { return this._state.providerId === "google.com"; }

	private updateState(user: User | null) {
		const oldUid = this._state.uid;
		this.firebaseUser = user;

		FriendsService.clearCache();
		statisticsState.clearCache();
		notificationStore.clear();
		settingsStore.resetUserSpecificData();

		if (user) {
			this._state = serializeUser(user);
			SyncService.init(user.uid);
			PresenceService.init(user.uid);
			friendsStore.init(user.uid);
		} else {
			if (oldUid) PresenceService.goOffline(oldUid);
			SyncService.stop();
			friendsStore.stop();
			friendsStore.reset();
			this._state = serializeUser(null);
		}

		logService.log("debug", "[AuthStore] State updated:", {
			uid: this._state.uid,
			email: this._state.email,
			isAnonymous: this._state.isAnonymous,
		});
	}

	async loginWithGoogle() {
		const result = await AuthService.linkWithGoogle();
		if (result) this.updateState(result);
		return result;
	}

	async registerWithEmail(email: string, password: string) {
		const result = await AuthService.linkWithEmail(email, password);
		if (result) this.updateState(result);
		return result;
	}

	async signInWithEmail(email: string, password: string) {
		const result = await AuthService.signInWithEmail(email, password);
		if (result) this.updateState(result);
		return result;
	}

	async changePassword(currentPassword: string, newPassword: string) {
		return await AuthService.changePassword(currentPassword, newPassword);
	}

	async sendPasswordReset() {
		if (this._state.email) return await AuthService.sendPasswordReset(this._state.email);
	}

	async deleteAccount(password: string) {
		return await AuthService.deleteAccount(password);
	}

	async updateProfile(displayName?: string, photoURL?: string) {
		if (!this.firebaseUser) return;
		try {
			const updatedUser = await AuthService.updateProfile(displayName, photoURL);
			this.updateState(updatedUser as User);
			const { FriendsService } = await import("../services/firebase/FriendsService");
			await FriendsService.updatePublicProfile();
		} catch (error) {
			logService.error("debug", "[AuthStore] Failed to update profile", error);
			throw error;
		}
	}

	/**
	 * Задати ім'я — акаунту або, якщо акаунта немає, собі як гостю.
	 *
	 * Одна точка входу для обох станів: інтерфейсу не треба знати, чи є сеанс,
	 * і саме через це знання його раніше й не було — форма кликала
	 * `updateProfile()`, який для гостя тихо виходив.
	 */
	async setDisplayName(name: string) {
		const trimmed = name.trim();
		if (!trimmed) return;

		if (this.firebaseUser) {
			await this.updateProfile(trimmed);
			return;
		}

		this._guestName = trimmed;
		localStorageProvider.setItem(GUEST_NAME_KEY, trimmed);
	}

	/**
	 * Віддати гостьове ім'я щойно створеному акаунту — і лише йому.
	 *
	 * Умова `!user.displayName` тримає межу: акаунт, який уже має ім'я (вхід
	 * через Google, повторний вхід поштою), не перезаписується. Після передачі
	 * локальний ключ прибирається — інакше те саме ім'я лежало б у двох місцях і
	 * розійшлося б із першою ж правкою.
	 *
	 * Кличе це ФОРМА, одразу після успішної реєстрації, і `user` тут — той, що
	 * вона отримала. Не `this.firebaseUser`: його ставить `onAuthStateChanged`,
	 * тобто на цей момент він може бути ще не встановлений, і перевірка
	 * всередині `updateProfile()` відкинула б передачу саме на реєстрації —
	 * єдиному моменті, для якого вона й існує.
	 */
	async claimGuestName(user: User | null) {
		if (!user || user.displayName || !this._guestName) return;
		const claimed = this._guestName;
		this._guestName = null;
		localStorageProvider.removeItem(GUEST_NAME_KEY);
		try {
			const updated = await AuthService.updateProfile(claimed);
			if (updated) this.updateState(updated);
			await FriendsService.updatePublicProfile();
		} catch (error) {
			logService.error("debug", "[AuthStore] Failed to claim guest name", error);
		}
	}

	async logout() {
		logService.log("debug", "[AuthStore] Logging out...");
		try {
			await SyncService.uploadAll(true);
		} catch (e) {
			logService.error("debug", "[AuthStore] Final sync failed, proceeding with logout", e);
		}
		SyncService.resetLocalData();
		await AuthService.logout();
	}
}

export const authStore = new AuthStore();
