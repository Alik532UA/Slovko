import { logService } from "../../services/logService.svelte";
import {
	signInAnonymously,
	signOut as fbSignOut,
	onAuthStateChanged,
	type User,
} from "firebase/auth";
import { getAuthInstance, getGoogleProvider } from "./config";
import { AuthError, errorToMessageKey } from "$lib/errors";
/*
 * Ліниві акцесори до Firebase.
 *
 * SDK піднімається при ПЕРШОМУ зверненні, а не на імпорті цього модуля: інакше
 * будь-який тест, що транзитивно тягне файл, вимагав би бойових ключів, щоб
 * узагалі зібратися (CLOUD-DATABASE-v8 § 10.1).
 */
const auth = () => getAuthInstance();
const googleProvider = () => getGoogleProvider();

/**
 * Межа адаптера (SVELTE-CORE-v8 § 3.6): усе, що йде з цього сервісу назовні, —
 * доменна помилка з ключем i18n, а не помилка Firebase SDK.
 *
 * Доти назовні летіла помилка SDK, а форма показувала її `message` як є —
 * англійський рядок виду `Firebase: Error (auth/wrong-password).` замість
 * шістнадцяти перекладених повідомлень, які лежали у словниках без ужитку.
 */
const asAuthError = (error: unknown) =>
	error instanceof AuthError
		? error
		: new AuthError(errorToMessageKey(error), error);


/**
 * Сервіс для керування автентифікацією Firebase
 */
export const AuthService = {
	/**
	 * Ініціалізація слухача стану користувача
	 */
	init(onUserChanged: (user: User | null) => void) {
		return onAuthStateChanged(auth(), (user) => {
			onUserChanged(user);
		});
	},

	/**
	 * Анонімний вхід
	 */
	async loginAnonymously() {
		try {
			await signInAnonymously(auth());
		} catch (error) {
			logService.error("debug", "Firebase Anonymous Auth Error:", error);
			throw error; // Прокидаємо помилку далі
		}
	},

	/**
	 * Отримати методи входу для email (потрібно вимкнути Email Enumeration Protection у Firebase Console)
	 */
	async getProvidersForEmail(email: string): Promise<string[]> {
		const { fetchSignInMethodsForEmail } = await import("firebase/auth");
		try {
			const providers = await fetchSignInMethodsForEmail(auth(), email);
			return providers;
		} catch (error) {
			logService.error("debug", "[AuthService] Fetch methods error:", error);
			return [];
		}
	},

	/**
	 * Вхід або прив'язка Google-акаунта
	 */
	async linkWithGoogle() {
		const { signInWithPopup, linkWithPopup } = await import("firebase/auth");

		try {
			const user = auth().currentUser;

			// 1. Якщо користувач не залогінений
			if (!user || user.isAnonymous) {
				// Спробуємо просто залогінитись
				try {
					const result = await signInWithPopup(auth(), googleProvider());

					// Якщо ми були анонімом, і у нас були дані — треба попередити,
					// що дані аноніма можуть бути втрачені, якщо не зробити link.
					// Але Firebase SDK автоматично не мержить дані при signInWithPopup.

					return result.user;
				} catch (error) {
					// Код записаний саме як `auth/…`. Доти тут стояло `auth()/…`
					// — слід автозаміни `auth.` → `auth()`, який не збігався ні з
					// чим, тож гілка не спрацьовувала жодного разу, а користувач
					// бачив сире повідомлення SDK.
					throw asAuthError(error);
				}
			}

			// 2. Якщо користувач вже залогінений через Email — ПРИВ'ЯЗУЄМО
			try {
				await linkWithPopup(user, googleProvider());
				await user.reload();
				logService.log("debug", 
					"[AuthService] Google successfully linked to existing Email account",
				);
				return user;
			} catch (error) {
				// `auth/credential-already-in-use` — цей Google-акаунт уже
				// прив'язаний до ІНШОГО користувача Slovko.
				throw asAuthError(error);
			}
		} catch (error) {
			throw asAuthError(error);
		}
	},

	/**
	 * Реєстрація або прив'язка Email/Password
	 */
	async linkWithEmail(email: string, password: string) {
		const {
			EmailAuthProvider,
			linkWithCredential,
			createUserWithEmailAndPassword,
		} = await import("firebase/auth");

		try {
			if (!auth().currentUser) {
				// Для гостя — створюємо новий акаунт
				const result = await createUserWithEmailAndPassword(
					auth(),
					email,
					password,
				);
				return result.user;
			} else {
				// Для аноніма — прив'язуємо. Користувача беремо один раз: між
				// зверненнями `currentUser` може стати іншим.
				const anonymous = auth().currentUser;
				if (!anonymous) return null;
				const credential = EmailAuthProvider.credential(email, password);
				const result = await linkWithCredential(anonymous, credential);
				await result.user.reload();
				return result.user;
			}
		} catch (error) {
			throw asAuthError(error);
		}
	},

	/**
	 * Вхід в існуючий акаунт Email/Password
	 */
	async signInWithEmail(email: string, password: string) {
		const { signInWithEmailAndPassword } = await import("firebase/auth");

		try {
			const result = await signInWithEmailAndPassword(auth(), email, password);
			return result.user;
		} catch (error) {
			throw asAuthError(error);
		}
	},

	/**
	 * Вихід
	 */
	async logout() {
		try {
			await fbSignOut(auth());
			// Після виходу onAuthStateChanged автоматично викличе loginAnonymously
		} catch (error) {
			logService.error("debug", "Firebase SignOut Error:", error);
		}
	},

	/**
	 * Оновлення профілю користувача
	 */
	async updateProfile(
		displayName?: string,
		photoURL?: string,
	): Promise<User | null> {
		// Захоплюємо один раз: `currentUser` може змінитися між зверненнями.
		const user = auth().currentUser;
		if (!user) return null;
		const { updateProfile } = await import("firebase/auth");

		try {
			const updates: { displayName?: string; photoURL?: string } = {};
			if (displayName !== undefined && displayName !== null)
				updates.displayName = displayName;
			if (photoURL !== undefined && photoURL !== null)
				updates.photoURL = photoURL;

			await updateProfile(user, updates);
			await user.reload();
			return user;
		} catch (error) {
			logService.error("debug", "Error updating profile:", error);
			throw error;
		}
	},

	/**
	 * Зміна пароля (потребує повторної автентифікації)
	 */
	async changePassword(currentPassword: string, newPassword: string) {
		// Захоплюємо один раз: інакше між перевіркою й використанням
		// `currentUser` може стати `null`, і повторна автентифікація впаде.
		const user = auth().currentUser;
		if (!user?.email) return;

		const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } =
			await import("firebase/auth");
		const credential = EmailAuthProvider.credential(user.email, currentPassword);

		await reauthenticateWithCredential(user, credential);
		await updatePassword(user, newPassword);
	},

	/**
	 * Відправка листа для скидання пароля
	 */
	async sendPasswordReset(email: string) {
		const { sendPasswordResetEmail } = await import("firebase/auth");

		try {
			await sendPasswordResetEmail(auth(), email);
		} catch (error) {
			throw asAuthError(error);
		}
	},

	/**
	 * Видалення акаунту (потребує повторної автентифікації)
	 */
	async deleteAccount(password?: string) {
		// Захоплюємо один раз: `currentUser` може змінитися між зверненнями.
		const user = auth().currentUser;
		if (!user) return;
		const {
			EmailAuthProvider,
			GoogleAuthProvider,
			reauthenticateWithCredential,
			reauthenticateWithPopup,
			deleteUser,
		} = await import("firebase/auth");
		const { doc, deleteDoc } = await import("firebase/firestore");
		const { getDb } = await import("./config");

		const uid = user.uid;
		const providerId = user.providerData[0]?.providerId;

		try {
			// 1. Повторна автентифікація
			if (providerId === "google.com") {
				const provider = new GoogleAuthProvider();
				await reauthenticateWithPopup(user, provider);
			} else if (password && user.email) {
				const credential = EmailAuthProvider.credential(user.email, password);
				await reauthenticateWithCredential(user, credential);
			} else if (!user.isAnonymous) {
				throw new AuthError("profile.errors.enterPassword");
			}

			// 2. Видалення даних з Firestore
			const userDocRef = doc(getDb(), "users", uid);
			const profileDocRef = doc(getDb(), "profiles", uid);

			try {
				await Promise.all([deleteDoc(userDocRef), deleteDoc(profileDocRef)]);
			} catch (e) {
				logService.warn("debug", "[AuthService] Failed to delete Firestore data:", e);
			}

			// 3. Видалення самого користувача
			await deleteUser(user);
		} catch (error) {
			throw asAuthError(error);
		}
	},
};
