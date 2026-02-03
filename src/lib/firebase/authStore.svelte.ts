import { auth } from "./config";
import { AuthService } from "./AuthService";
import { SyncService } from "./SyncService";
import type { User } from "firebase/auth";

/**
 * Інтерфейс для серіалізованого стану користувача
 * SSoT: Зберігаємо тільки необхідні дані, не весь Firebase User об'єкт
 */
interface AuthState {
    uid: string | null;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    isAnonymous: boolean;
    isGuest: boolean;
}

/**
 * Створює серіалізований стан з Firebase User
 * Чиста функція без побічних ефектів
 */
function serializeUser(user: User | null): AuthState {
    if (!user) {
        return {
            uid: null,
            email: null,
            displayName: null,
            photoURL: null,
            isAnonymous: false,
            isGuest: true
        };
    }
    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isAnonymous: user.isAnonymous,
        isGuest: false
    };
}

/**
 * Стор для збереження стану автентифікації користувача
 * 
 * Архітектурні принципи:
 * - SSoT: Стан зберігається як серіалізований об'єкт, не як мутабельний Firebase User
 * - UDF: Оновлення відбувається тільки через updateState()
 * - SoC: AuthService відповідає за Firebase API, authStore — за реактивний стан
 */
function createAuthStore() {
    // Серіалізований стан (SSoT) — новий об'єкт при кожному оновленні гарантує реактивність
    let state = $state<AuthState>(serializeUser(null));
    let isInitialized = $state(false);

    // Оригінальний Firebase User для операцій (не для UI)
    let firebaseUser: User | null = null;

    /**
     * Єдина точка оновлення стану (UDF)
     * Створює новий об'єкт стану, гарантуючи реактивність Svelte 5
     */
    function updateState(user: User | null) {
        firebaseUser = user;
        state = serializeUser(user);  // Новий об'єкт — тригерить реактивність

        console.log('[AuthStore] State updated:', {
            uid: state.uid,
            email: state.email,
            isAnonymous: state.isAnonymous
        });

        if (user) {
            SyncService.init(user.uid);
        } else {
            SyncService.stop();
        }
    }

    // Ініціалізація слухача Firebase Auth
    AuthService.init((user) => {
        console.log('[AuthStore] onAuthStateChanged:', {
            uid: user?.uid,
            isAnonymous: user?.isAnonymous
        });

        updateState(user);
        isInitialized = true;
    });

    return {
        // Геттери для реактивного доступу до стану
        get user() { return state; },
        get isInitialized() { return isInitialized; },
        get isAnonymous() { return state.isAnonymous; },
        get isGuest() { return state.isGuest; },
        get uid() { return state.uid; },
        get email() { return state.email; },
        get displayName() { return state.displayName; },
        get photoURL() { return state.photoURL; },

        /**
         * Прив'язка Google акаунту
         */
        async loginWithGoogle() {
            const result = await AuthService.linkWithGoogle();
            if (result) {
                console.log('[AuthStore] loginWithGoogle success, updating state');
                updateState(result);
                // Примусова синхронізація локальних даних у новий акаунт
                await SyncService.performUpload();
            }
            return result;
        },

        /**
         * Реєстрація через Email/Password
         */
        async registerWithEmail(email: string, password: string) {
            const result = await AuthService.linkWithEmail(email, password);
            if (result) {
                console.log('[AuthStore] registerWithEmail success, updating state');
                updateState(result);
                // Примусова синхронізація
                await SyncService.performUpload();
            }
            return result;
        },

        /**
         * Вхід в існуючий акаунт
         */
        async signInWithEmail(email: string, password: string) {
            const result = await AuthService.signInWithEmail(email, password);
            if (result) {
                updateState(result);
                // Після входу в існуючий акаунт, SyncService завантажить дані через onSnapshot.
                // Ми можемо викликати performUpload якщо хочемо об'єднати локальні дані з хмарними.
                await SyncService.performUpload();
            }
            return result;
        },

        async changePassword(currentPassword: string, newPassword: string) {
            return await AuthService.changePassword(currentPassword, newPassword);
        },

        async sendPasswordReset() {
            if (state.email) {
                return await AuthService.sendPasswordReset(state.email);
            }
        },

        async deleteAccount(password: string) {
            return await AuthService.deleteAccount(password);
        },

        async updateProfile(displayName?: string, photoURL?: string) {
            if (!firebaseUser) return;
            try {
                // @ts-ignore
                const updatedUser = await AuthService.updateProfile(displayName, photoURL);
                updateState(updatedUser as User);
                
                // Примусово оновлюємо публічний профіль для пошуку та лідерборду
                const { FriendsService } = await import("./FriendsService");
                await FriendsService.updatePublicProfile();
                
                console.log('[AuthStore] Profile and public profile updated');
            } catch (error) {
                console.error('[AuthStore] Failed to update profile', error);
                throw error;
            }
        },

        async logout() {
            // @ts-ignore
            await AuthService.logout();
            updateState(null);
            SyncService.resetLocalData();
        }
    };
}

export const authStore = createAuthStore();
