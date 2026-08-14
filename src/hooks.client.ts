import type { HandleClientError } from '@sveltejs/kit';
import { errorHandler } from '$lib/services/errorHandler';

/**
 * Неперехоплені помилки клієнта (ERROR-HANDLING-v8 § 2.4).
 *
 * `errorHandler` у проєкті є, і він робить саме те, що треба: пише в журнал і
 * за потреби показує сповіщення. Але кликали його лише з тих місць, де про
 * помилку здогадалися заздалегідь. Помилка, яку не спіймали, зникала безслідно.
 *
 * `showToast: false` навмисно: SvelteKit і так показує сторінку помилки, і
 * сповіщення поверх неї було б другим повідомленням про ту саму подію.
 *
 * Повертається УЗАГАЛЬНЕНЕ повідомлення, а не `error.message`: текст рантайму
 * («Cannot read properties of undefined») відвідувачу нічого не пояснює, зате
 * показує нутрощі застосунку.
 *
 * Гачок спрацьовує лише на НЕОЧІКУВАНІ помилки: `error()` і `redirect()` через
 * нього не проходять, тож 404 сюди не потрапляє.
 */
export const handleError: HandleClientError = ({ error, event, status }) => {
	if (status === 404) return;

	errorHandler.handle(error, `client-unhandled:${event?.url?.pathname ?? 'unknown'}`, {
		showToast: false,
		category: 'app'
	});

	return { message: 'Сталася помилка. Спробуйте оновити сторінку.' };
};
