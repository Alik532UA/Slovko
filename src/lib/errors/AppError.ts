/**
 * Доменні класи помилок (ERROR-HANDLING-v8 § 1).
 *
 * Причина існування цього модуля — не архітектурна охайність, а конкретний
 * дефект, знайдений аудитом 2026-08-19: помилки переносилися РЯДКОМ усередині
 * `new Error("AUTH_REQUIRED")`, а споживач звіряв `err.message === "..."`.
 * Там, де такого звіряння не було, значення показувалося користувачеві як є:
 * форма входу віддавала на екран `Firebase: Error (auth/wrong-password).`, а
 * форма відгуку — слово `AUTH_REQUIRED`. Це CRITICAL з таблиці анти-патернів
 * ERROR-HANDLING-v8: показ сирого повідомлення від сервера/SDK користувачеві.
 *
 * Тому помилка несе не текст, а **ключ i18n**. Текст добуває той, хто показує,
 * і робить це мовою відвідувача. Сам ключ на екран не потрапляє ніколи:
 * `errorToMessageKey()` завжди повертає ключ, який існує у словнику, і це
 * закріплено інваріантом `errors.test.ts`.
 */

/** Базовий клас усіх доменних помилок застосунку. */
export class AppError extends Error {
	/**
	 * @param code машинний код для журналу — те, що читає розробник
	 * @param messageKey ключ i18n — те, що читає відвідувач
	 * @param cause початкова помилка SDK; зберігається для журналу
	 */
	constructor(
		readonly code: string,
		readonly messageKey: string,
		override readonly cause?: unknown,
	) {
		// У `message` навмисно лежить технічна форма, а не текст для людини:
		// цей рядок іде в `logService`, а не на екран.
		super(`${code} (${messageKey})`);
		this.name = new.target.name;
	}
}

/** Збій входу, реєстрації чи прив'язки акаунта. */
export class AuthError extends AppError {
	constructor(messageKey = "profile.errors.unknownError", cause?: unknown) {
		super("AUTH_ERROR", messageKey, cause);
	}
}

/**
 * Правила доступу відмовили в записі.
 *
 * Окремий клас, а не `AuthError`: для відвідувача це «увійдіть в акаунт», а
 * для розробника — сигнал, що прогалина може бути у ФАЙЛІ ПРАВИЛ, а не в
 * сеансі. Саме ця плутанина 2026-08-18 показувала відсутнє правило `feedback`
 * як проблему зі входом.
 */
export class PermissionError extends AppError {
	constructor(messageKey = "errors.authRequired", cause?: unknown) {
		super("PERMISSION_DENIED", messageKey, cause);
	}
}

/**
 * Мережа недоступна або сервіс не відповів.
 *
 * Очікуваний збій (§ 1.4): логується рівнем `warn`, а не `error` — інакше
 * індикатор помилок засвічується від звичайного відключення мережі.
 */
export class NetworkError extends AppError {
	readonly expected = true;

	constructor(messageKey = "sync.status.offline", cause?: unknown) {
		super("NETWORK_ERROR", messageKey, cause);
	}
}

/** Запит відхилено сервісом: дані не пройшли перевірку або форма невірна. */
export class SubmitError extends AppError {
	constructor(messageKey = "errors.submitFailed", cause?: unknown) {
		super("SUBMIT_FAILED", messageKey, cause);
	}
}


