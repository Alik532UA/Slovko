/**
 * Точка входу доменних помилок: `import { AuthError } from "$lib/errors"`.
 *
 * Класи й відображення лежать окремо навмисно — інакше `errorToMessageKey`
 * імпортував би `AppError` із того самого файлу, що реекспортує його самого,
 * тобто циклом (SVELTE-CORE-v8 § 3.5).
 */

export {
	AppError,
	AuthError,
	NetworkError,
	PermissionError,
	SubmitError,
} from "./AppError";

export {
	ALL_ERROR_CODES,
	ALL_MESSAGE_KEYS,
	errorToMessageKey,
	FALLBACK_MESSAGE_KEY,
} from "./errorToMessageKey";
