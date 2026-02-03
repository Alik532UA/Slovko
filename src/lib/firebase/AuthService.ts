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
        }
    },

    /**
     * Вхід або прив'язка Google-акаунта
     */
    async linkWithGoogle() {
        const { signInWithPopup } = await import("firebase/auth");
        
        try {
            if (!auth.currentUser) {
                // Якщо користувач гість — просто логінимо через Popup
                const result = await signInWithPopup(auth, googleProvider);
                return result.user;
            } else {
                // Якщо вже є анонімний акаунт — прив'язуємо
                const result = await linkWithPopup(auth.currentUser, googleProvider);
                await result.user.reload();
                return auth.currentUser;
            }
        } catch (error: any) {
            if (error.code === 'auth/credential-already-in-use') {
                // Якщо акаунт вже існує, а ми намагалися прив'язати — просто логінимося
                const result = await signInWithPopup(auth, googleProvider);
                return result.user;
            }
            throw error;
        }
    },

    /**
     * Реєстрація або прив'язка Email/Password
     */
    async linkWithEmail(email: string, password: string) {
        const { EmailAuthProvider, linkWithCredential, createUserWithEmailAndPassword } = await import("firebase/auth");
        
        try {
            if (!auth.currentUser) {
                // Для гостя — створюємо новий акаунт
                const result = await createUserWithEmailAndPassword(auth, email, password);
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
    async updateProfile(displayName?: string, photoURL?: string): Promise<User | null> {
        if (!auth.currentUser) return null;

        const { updateProfile } = await import("firebase/auth");

        try {
            const updates: { displayName?: string, photoURL?: string } = {};
            if (displayName !== undefined && displayName !== null) updates.displayName = displayName;
            if (photoURL !== undefined && photoURL !== null) updates.photoURL = photoURL;

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
        const { doc, deleteDoc } = await import("firebase/firestore");
        const { db } = await import("./config");
        
        const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
        const uid = auth.currentUser.uid;

        try {
            // 1. Повторна автентифікація (обов'язково для видалення)
            await reauthenticateWithCredential(auth.currentUser, credential);

            // 2. Видалення даних з Firestore
            const userDocRef = doc(db, "users", uid);
            const profileDocRef = doc(db, "profiles", uid);
            
            try {
                await Promise.all([
                    deleteDoc(userDocRef),
                    deleteDoc(profileDocRef)
                ]);
                console.log("[AuthService] Firestore data deleted for UID:", uid);
            } catch (e) {
                console.warn("[AuthService] Failed to delete some Firestore data:", e);
                // Продовжуємо видалення акаунта навіть якщо дані не видалилися (напр. через правила)
            }

            // 3. Видалення самого користувача з Firebase Auth
            await deleteUser(auth.currentUser);
        } catch (error: any) {
            throw error;
        }
    }
};
