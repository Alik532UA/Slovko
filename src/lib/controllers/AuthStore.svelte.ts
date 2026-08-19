import { logService } from "../services/logService.svelte";
import { AuthService } from "../services/firebase/AuthService";
import { SyncService } from "../services/firebase/SyncService.svelte";
import { PresenceService } from "../services/firebase/PresenceService.svelte";
import { FriendsService } from "../services/firebase/FriendsService";
import { friendsStore } from "./FriendsStore.svelte";
import { statisticsState } from "./StatisticsState.svelte";
import { notificationStore } from "./NotificationStore.svelte";
import { settingsStore } from "./SettingsStore.svelte";
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
 * AuthStore - керування станом автентифікації.
 */
class AuthStore {
	private _state = $state<AuthState>(serializeUser(null));
	private _isInitialized = $state(false);
	private firebaseUser: User | null = null;

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
	get displayName() { return this._state.displayName; }
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
