/**
 * Відображення помилки → ключ i18n (ERROR-HANDLING-v8 § 4.1).
 *
 * Чиста функція без залежності від `svelte-i18n`: показ робить компонент через
 * `$_(errorToMessageKey(e))`, а сама відповідність перевіряється юніт-тестом
 * без підняття сховища локалі.
 *
 * Перелік кодів нижче — не здогад. Усі ключі, на які він відображає, вже
 * лежали у СЕМИ словниках проєкту й не використовувалися жодним рядком коду:
 * шістнадцять перекладених повідомлень (112 рядків тексту), написаних рівно
 * для цих випадків, показувалися відвідувачеві як англійський текст Firebase.
 * Це та сама пастка «файл існує — отже, робота зроблена»
 * (PROJECT-STRUCTURE-v8 § 4.3), тільки на рівні ключів локалізації.
 */

import { AppError } from "./AppError";

/** Ключ, який дістає все, чого немає в переліку. */
export const FALLBACK_MESSAGE_KEY = "profile.errors.unknownError";

/**
 * Коди Firebase Auth → ключі словника.
 *
 * Форма коду — `auth/щось`. Саме тут жив дефект: у `AuthService` два коди були
 * записані як `auth()/...` (слід автозаміни `auth.` → `auth()`), тож обидві
 * гілки не спрацьовували НІКОЛИ, а користувач бачив сире повідомлення SDK.
 */
const AUTH_CODE_TO_KEY: Record<string, string> = {
	"auth/invalid-email": "profile.errors.invalidEmail",
	"auth/missing-email": "profile.errors.enterEmail",
	"auth/missing-password": "profile.errors.enterPassword",
	"auth/internal-error": "profile.errors.fillFields",
	"auth/user-not-found": "profile.errors.userNotFound",
	"auth/wrong-password": "profile.errors.invalidCredentials",
	"auth/invalid-credential": "profile.errors.invalidCredentials",
	"auth/invalid-login-credentials": "profile.errors.invalidCredentials",
	"auth/email-already-in-use": "profile.errors.emailInUse",
	"auth/weak-password": "profile.errors.weakPassword",
	"auth/popup-closed-by-user": "profile.errors.popupClosed",
	"auth/cancelled-popup-request": "profile.errors.popupClosed",
	"auth/popup-blocked": "profile.errors.waitingGoogle",
	"auth/account-exists-with-different-credential":
		"profile.errors.accountExistsEmail",
	"auth/credential-already-in-use": "profile.errors.googleAlreadyLinked",
	"auth/provider-already-linked": "profile.errors.accountUsesGoogle",
	"auth/network-request-failed": "sync.status.offline",
	"auth/too-many-requests": "profile.errors.loginFailed",
};

/** Коди Firestore/RTDB, які доходять до екрана. */
const DB_CODE_TO_KEY: Record<string, string> = {
	"permission-denied": "errors.authRequired",
	PERMISSION_DENIED: "errors.authRequired",
	unavailable: "sync.status.offline",
	unauthenticated: "errors.authRequired",
};

/** Витягти `code` з помилки SDK, не припускаючи її форми. */
function codeOf(error: unknown): string | null {
	if (typeof error !== "object" || error === null) return null;
	const code = (error as { code?: unknown }).code;
	return typeof code === "string" ? code : null;
}

/**
 * Ключ i18n для будь-чого, що прилетіло в `catch`.
 *
 * Повертає ключ ЗАВЖДИ: жодна гілка не віддає сирий текст помилки. Саме тому
 * компонент може писати `$_(errorToMessageKey(e))` без додаткових перевірок.
 */
export function errorToMessageKey(error: unknown): string {
	if (error instanceof AppError) return error.messageKey;

	const code = codeOf(error);
	if (code) {
		if (code in AUTH_CODE_TO_KEY) return AUTH_CODE_TO_KEY[code];
		if (code in DB_CODE_TO_KEY) return DB_CODE_TO_KEY[code];
	}

	return FALLBACK_MESSAGE_KEY;
}

/** Перелік для інваріанта: кожен ключ мусить існувати у словнику. */
export const ALL_MESSAGE_KEYS = [
	FALLBACK_MESSAGE_KEY,
	...Object.values(AUTH_CODE_TO_KEY),
	...Object.values(DB_CODE_TO_KEY),
];

/** Перелік кодів для інваріанта: жоден не сміє мати форму `auth()/...`. */
export const ALL_ERROR_CODES = [
	...Object.keys(AUTH_CODE_TO_KEY),
	...Object.keys(DB_CODE_TO_KEY),
];
