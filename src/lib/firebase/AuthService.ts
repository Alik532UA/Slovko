import {
	signInAnonymously,
	signOut as fbSignOut,
	onAuthStateChanged,
	type User,
} from "firebase/auth";
import { auth, googleProvider } from "./config";

/**
 * Сервіс для керування автентифікацією Firebase
 */
export const AuthService = {
	/**
	 * Ініціалізація слухача стану користувача
	 */
	init(onUserChanged: (user: User | null) => void) {
		return onAuthStateChanged(auth, (user) => {
			onUserChanged(user);
		});
	},

	/**
	 * Анонімний вхід
	 */
	async loginAnonymously() {
		try {
			await signInAnonymously(auth);
		} catch (error) {
			console.error("Firebase Anonymous Auth Error:", error);
			throw error; // Прокидаємо помилку далі
		}
	},

	/**
	 * Отримати методи входу для email (потрібно вимкнути Email Enumeration Protection у Firebase Console)
	 */
	async getProvidersForEmail(email: string): Promise<string[]> {
		const { fetchSignInMethodsForEmail } = await import("firebase/auth");
		try {
			const providers = await fetchSignInMethodsForEmail(auth, email);
			return providers;
		} catch (error) {
			console.error("[AuthService] Fetch methods error:", error);
			return [];
		}
	},

	/**
	 * Вхід або прив'язка Google-акаунта
	 */
	async linkWithGoogle() {
		const { signInWithPopup, linkWithPopup } = await import("firebase/auth");

		try {
			const user = auth.currentUser;

			// 1. Якщо користувач не залогінений
			if (!user || user.isAnonymous) {
				// Спробуємо просто залогінитись
				try {
					const result = await signInWithPopup(auth, googleProvider);

					// Якщо ми були анонімом, і у нас були дані — треба попередити,
					// що дані аноніма можуть бути втрачені, якщо не зробити link.
					// Але Firebase SDK автоматично не мержить дані при signInWithPopup.

					return result.user;
				} catch (error: any) {
					if (error.code === "auth/account-exists-with-different-credential") {
						// Це критичний момент: користувач намагається зайти через Google,
						// але акаунт вже створений через Email.
						throw new Error("ACCOUNT_EXISTS_EMAIL");
					}
					throw error;
				}
			}

			// 2. Якщо користувач вже залогінений через Email — ПРИВ'ЯЗУЄМО
			try {
				const result = await linkWithPopup(user, googleProvider);
				await user.reload();
				console.log(
					"[AuthService] Google successfully linked to existing Email account",
				);
				return user;
			} catch (error: any) {
				if (error.code === "auth/credential-already-in-use") {
					// Цей Google-акаунт вже прив'язаний до ІНШОГО користувача
					throw new Error("GOOGLE_ALREADY_LINKED_ELSEWHERE");
				}
				throw error;
			}
		} catch (error: any) {
			throw error;
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
			if (!auth.currentUser) {
				// Для гостя — створюємо новий акаунт
				const result = await createUserWithEmailAndPassword(
					auth,
					email,
					password,
				);
				return result.user;
			} else {
				// Для аноніма — прив'язуємо
				const credential = EmailAuthProvider.credential(email, password);
				const result = await linkWithCredential(auth.currentUser, credential);
				await result.user.reload();
				return auth.currentUser;
			}
		} catch (error: any) {
			throw error;
		}
	},

	/**
	 * Вхід в існуючий акаунт Email/Password
	 */
	async signInWithEmail(email: string, password: string) {
		const { signInWithEmailAndPassword } = await import("firebase/auth");

		try {
			const result = await signInWithEmailAndPassword(auth, email, password);
			return result.user;
		} catch (error: any) {
			throw error;
		}
	},

	/**
	 * Вихід
	 */
	async logout() {
		try {
			await fbSignOut(auth);
			// Після виходу onAuthStateChanged автоматично викличе loginAnonymously
		} catch (error) {
			console.error("Firebase SignOut Error:", error);
		}
	},

	/**
	 * Оновлення профілю користувача
	 */
	async updateProfile(
		displayName?: string,
		photoURL?: string,
	): Promise<User | null> {
		if (!auth.currentUser) return null;

		const { updateProfile } = await import("firebase/auth");

		try {
			const updates: { displayName?: string; photoURL?: string } = {};
			if (displayName !== undefined && displayName !== null)
				updates.displayName = displayName;
			if (photoURL !== undefined && photoURL !== null)
				updates.photoURL = photoURL;

			await updateProfile(auth.currentUser, updates);
			await auth.currentUser.reload();
			return auth.currentUser;
		} catch (error) {
			console.error("Error updating profile:", error);
			throw error;
		}
	},

	/**
	 * Зміна пароля (потребує повторної автентифікації)
	 */
	async changePassword(currentPassword: string, newPassword: string) {
		if (!auth.currentUser || !auth.currentUser.email) return;

		const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } =
			await import("firebase/auth");
		const credential = EmailAuthProvider.credential(
			auth.currentUser.email,
			currentPassword,
		);

		try {
			await reauthenticateWithCredential(auth.currentUser, credential);
			await updatePassword(auth.currentUser, newPassword);
		} catch (error: any) {
			throw error;
		}
	},

	/**
	 * Відправка листа для скидання пароля
	 */
	async sendPasswordReset(email: string) {
		const { sendPasswordResetEmail } = await import("firebase/auth");

		try {
			await sendPasswordResetEmail(auth, email);
		} catch (error: any) {
			throw error;
		}
	},

	/**
	 * Видалення акаунту (потребує повторної автентифікації)
	 */
	async deleteAccount(password?: string) {
		if (!auth.currentUser) return;

		const {
			EmailAuthProvider,
			GoogleAuthProvider,
			reauthenticateWithCredential,
			reauthenticateWithPopup,
			deleteUser,
		} = await import("firebase/auth");
		const { doc, deleteDoc } = await import("firebase/firestore");
		const { db } = await import("./config");

		const user = auth.currentUser;
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
				throw new Error("Password is required for email providers");
			}

			// 2. Видалення даних з Firestore
			const userDocRef = doc(db, "users", uid);
			const profileDocRef = doc(db, "profiles", uid);

			try {
				await Promise.all([deleteDoc(userDocRef), deleteDoc(profileDocRef)]);
			} catch (e) {
				console.warn("[AuthService] Failed to delete Firestore data:", e);
			}

			// 3. Видалення самого користувача
			await deleteUser(user);
		} catch (error: any) {
			throw error;
		}
	},
};
