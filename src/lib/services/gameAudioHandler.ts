import type { ActiveCard } from "../types";

/**
 * Сервіс для керування аудіо-відгуками у грі.
 * Відповідає за озвучення слів при успішному збігу карток,
 * враховуючи налаштування мов та переваги користувача.
 */
export class GameAudioHandler {
	/**
	 * Відтворює аудіо при успішному поєднанні пари карток.
	 *
	 * @param _card1 Перша вибрана картка
	 * @param _card2 Друга вибрана картка (пара до першої)
	 *
	 * Логіка враховує:
	 * - Яка з карток є мовою-джерелом (source), а яка — цільовою (target).
	 * - Чи увімкнено озвучення для відповідної сторони у налаштуваннях.
	 * - Додає затримку між озвученнями, якщо увімкнено обидва канали, для запобігання накладанню звуку.
	 */
	playMatch(_card1: ActiveCard, _card2: ActiveCard) {
		// Озвучення при поєднанні карток вимкнено, щоб уникнути подвійного звуку,
		// оскільки слово вже озвучується при натисканні на картку (в WordCard.svelte).
		// Закоментовано за запитом користувача, може знадобитися в майбутньому для специфічних режимів.
		
		/*
		// Access store value non-reactively (snapshot)
		const {
			sourceLanguage,
			targetLanguage,
			enablePronunciationSource,
			enablePronunciationTarget,
		} = settingsStore.value;

		const src = card1.language === sourceLanguage ? card1 : card2;
		const tgt = card1.language === targetLanguage ? card1 : card2;

		if (enablePronunciationSource) {
			speakText(src.text, src.language);
		}

		if (enablePronunciationTarget) {
			// Delay target audio if source is also played
			const delay = enablePronunciationSource ? 800 : 0;
			setTimeout(() => {
				speakText(tgt.text, tgt.language);
			}, delay);
		}
		*/
	}
}

export const gameAudioHandler = new GameAudioHandler();
