import {
    signInAnonymously,
    linkWithPopup,
    GoogleAuthProvider,
    signOut as fbSignOut,
    onAuthStateChanged,
    type User
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
            if (!user) {
                // Якщо користувача немає — створюємо анонімний вхід
                this.loginAnonymously();
            } else {
                onUserChanged(user);
            }
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
        }
    },

    /**
     * Прив'язка Google-акаунта до поточного анонімного профілю
     */
    async linkWithGoogle() {
        if (!auth.currentUser) return;

        try {
            // Використовуємо linkWithPopup щоб зберегти той самий UID
            const result = await linkWithPopup(auth.currentUser, googleProvider);
            // Перезавантажити користувача щоб оновити isAnonymous
            await result.user.reload();
            return auth.currentUser;
        } catch (error: any) {
            // Якщо акаунт вже існує, можна запропонувати signInWithPopup (але це змінить UID)
            if (error.code === 'auth/credential-already-in-use') {
                console.warn("Account already exists. Need to handle merge.");
                // Тут можна реалізувати логіку переключення акаунта
            }
            throw error;
        }
    },

    /**
     * Прив'язка Email/Password до поточного анонімного профілю (реєстрація)
     */
    async linkWithEmail(email: string, password: string) {
        if (!auth.currentUser) return;

        const { EmailAuthProvider, linkWithCredential } = await import("firebase/auth");
        const credential = EmailAuthProvider.credential(email, password);

        try {
            console.log('[AuthService] linkWithEmail: before link, isAnonymous:', auth.currentUser.isAnonymous);
            const result = await linkWithCredential(auth.currentUser, credential);
            console.log('[AuthService] linkWithEmail: after link, result.user.isAnonymous:', result.user.isAnonymous);

            // Перезавантажити користувача щоб оновити isAnonymous
            await result.user.reload();
            console.log('[AuthService] linkWithEmail: after reload, auth.currentUser.isAnonymous:', auth.currentUser?.isAnonymous);

            return auth.currentUser;
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                console.warn("Email already in use.");
            }
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
    async updateProfile(displayName: string, photoURL?: string) {
        if (!auth.currentUser) return;

        const { updateProfile } = await import("firebase/auth");

        try {
            const updates: { displayName?: string, photoURL?: string } = {};
            if (displayName !== undefined) updates.displayName = displayName;
            if (photoURL !== undefined) updates.photoURL = photoURL;

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

        const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import("firebase/auth");
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);

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
    async deleteAccount(password: string) {
        if (!auth.currentUser || !auth.currentUser.email) return;

        const { EmailAuthProvider, reauthenticateWithCredential, deleteUser } = await import("firebase/auth");
        const credential = EmailAuthProvider.credential(auth.currentUser.email, password);

        try {
            await reauthenticateWithCredential(auth.currentUser, credential);
            await deleteUser(auth.currentUser);
        } catch (error: any) {
            throw error;
        }
    }
};
