import type { HandleClientError } from "@sveltejs/kit";
import { errorHandler } from "$lib/services/errorHandler";
import { sessionStorageProvider } from "$lib/services/storage/storageProvider";

/**
 * Неперехоплені помилки клієнта (ERROR-HANDLING-v8 § 2.4).
 *
 * Гачок спрацьовує лише на НЕОЧІКУВАНІ помилки: `error()` і `redirect()` через
 * нього не проходять, тож 404 сюди не потрапляє. Перевірка статусу нижче —
 * дешева перестраховка, щоб у журналі не з'явився шум.
 *
 * **Тут НЕМАЄ Sentry, і це рішення, а не пропуск.** Блок ініціалізації
 * `@sentry/sveltekit` тут стояв і не працював жодного разу: пакета немає в
 * залежностях, тож імпорт писався через змінну з `@vite-ignore`, аби збірка не
 * впала на нерозв'язному модулі. У браузері голий специфікатор не резолвиться
 * в принципі, а `.catch(() => null)` ковтав це мовчки. OBSERVABILITY-v8 має
 * «Пріоритет: optional» і «Скіп-якщо: хобі-проєкт без активних користувачів»,
 * тож правильна відповідь — не імітувати трекінг, а не мати його. Збір звітів
 * робить `logService` і кнопка копіювання на службовому таблі.
 */

/**
 * Ключ маркера перезавантаження. Префікс `slovko_` додає сам фасад сховища.
 */
const CHUNK_RELOAD_KEY = "chunk_reload_at";

/**
 * Скільки чекати, перш ніж дозволити ДРУГЕ автоматичне перезавантаження.
 *
 * Це і є захист від циклу. Хвилини вистачає з запасом: свіжа збірка вантажиться
 * секунди, тож повторна та сама помилка в межах цього вікна означає не
 * застарілу вкладку, а щось, чого перезавантаження не лікує — тоді людині краще
 * показати помилку, ніж крутити сторінку.
 */
const RELOAD_COOLDOWN_MS = 60_000;

/**
 * Ознаки того, що з сервера просять частину застосунку, якої там уже немає
 * (VERSIONING § 4.5, `VER-OPEN-TAB-SURVIVES`, HIGH).
 *
 * Кожна збірка перейменовує чанки за хешем вмісту. Вкладка, відкрита ДО
 * деплою, тримає перелік старих адрес: перший же лінивий імпорт — модалка,
 * словник, SDK бази — тягне `_app/immutable/...`, отримує 404 і падає з
 * «Failed to fetch dynamically imported module». Для людини це виглядає як
 * зламаний застосунок, хоча зламана лише вкладка, і лікується перезавантаженням.
 *
 * Текст помилки різний у кожному рушії, тому їх тут кілька: Chrome каже
 * «Failed to fetch dynamically imported module», Firefox — «error loading
 * dynamically imported module», Safari — «Importing a module script failed».
 */
const STALE_CHUNK = [
	"failed to fetch dynamically imported module",
	"error loading dynamically imported module",
	"importing a module script failed",
	"failed to load module script",
];

function isStaleChunkError(error: unknown): boolean {
	const message =
		error instanceof Error
			? `${error.message} ${error.name}`
			: typeof error === "string"
				? error
				: typeof error === "object" && error !== null && "message" in error
					? String((error as { message: unknown }).message)
					: "";
	const lower = message.toLowerCase();
	return STALE_CHUNK.some((marker) => lower.includes(marker));
}

/**
 * Одне перезавантаження на вікно `RELOAD_COOLDOWN_MS`. Повертає `true`, якщо
 * перезавантаження почато — тоді викликач більше нічого не робить.
 */
function reloadOncePerWindow(): boolean {
	if (typeof window === "undefined") return false;

	const lastAt = Number(sessionStorageProvider.getItem(CHUNK_RELOAD_KEY) ?? 0);
	if (Number.isFinite(lastAt) && Date.now() - lastAt < RELOAD_COOLDOWN_MS) {
		return false;
	}

	// Записується ДО перезавантаження: після нього цей рядок уже не виконається.
	// Відмова сховища (приватний режим, переповнення) означає лише, що захисту
	// від циклу немає, — тоді краще показати помилку, ніж крутити сторінку.
	if (!sessionStorageProvider.setItem(CHUNK_RELOAD_KEY, String(Date.now()))) {
		return false;
	}

	window.location.reload();
	return true;
}

export const handleError: HandleClientError = ({ error, event, status }) => {
	if (status === 404) return;

	const stale = isStaleChunkError(error);

	// Журнал ведеться в обох випадках: подія «вкладка пережила деплой» цінна
	// сама по собі, і саме її бракує, коли користувач скаржиться на «Internal
	// Error» після оновлення сайту.
	errorHandler.handle(
		error,
		`client-unhandled:${event?.url?.pathname ?? "unknown"}`,
		{
			showToast: false,
			category: "app",
		},
	);

	if (stale && reloadOncePerWindow()) {
		return { message: "Застосунок оновився. Перезавантажуємо сторінку…" };
	}

	// Узагальнене повідомлення, а не `error.message`: текст рантайму нічого не
	// пояснює відвідувачу, зате показує нутрощі застосунку.
	return { message: "Сталася помилка. Спробуйте оновити сторінку." };
};
