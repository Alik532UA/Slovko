/**
 * Фабрика ігрових карток — реалізація патерну Factory.
 * Ізолює логіку створення карток, генерації транскрипції та перемішування.
 */
import type {
	ActiveCard,
	Language,
	TranslationDictionary,
	TranscriptionDictionary,
} from "../types";
import { getTranslation, getTranscription } from "../data/wordService";
import { generateRulesIPA } from "./transcriptionService";

/**
 * Генерує унікальний ID для картки.
 */
export function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Алгоритм перемішування масиву Фішера-Єйтса.
 */
export function shuffle<T>(array: T[]): T[] {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Створює пару карток (Source та Target) для заданого ключа слова.
 */
function createCardPair(
	wordKey: string,
	index: number,
	startSlot: number,
	sourceLanguage: Language,
	targetLanguage: Language,
	interfaceLanguage: Language,
	sourceTranslations: TranslationDictionary,
	targetTranslations: TranslationDictionary,
	sourceTranscriptions: TranscriptionDictionary,
	targetTranscriptions: TranscriptionDictionary,
	level?: string,
): { source: ActiveCard; target: ActiveCard } {
	const sourceText = getTranslation(
		wordKey,
		sourceTranslations,
		sourceLanguage,
	);
	const targetText = getTranslation(
		wordKey,
		targetTranslations,
		targetLanguage,
	);

	// Helper for transcription generation
	const getProcessedTranscription = (
		text: string,
		lang: Language,
		dict: TranscriptionDictionary,
	): string | undefined => {
		// 1. Спробуємо отримати статичну транскрипцію (наприклад, для EN)
		const staticTscr = getTranscription(wordKey, dict, true);
		if (staticTscr) return staticTscr;

		// 2. Якщо немає статичної, генеруємо за 2-ступеневим алгоритмом
		// (Текст -> IPA -> Мова Інтерфейсу)
		return generateRulesIPA(text, lang, interfaceLanguage || "uk");
	};

	const sourceTranscription = getProcessedTranscription(
		sourceText,
		sourceLanguage,
		sourceTranscriptions,
	);
	const targetTranscription = getProcessedTranscription(
		targetText,
		targetLanguage,
		targetTranscriptions,
	);

	const sourceCard: ActiveCard = {
		id: `src-${generateId()}-${index}`,
		wordKey,
		level,
		text: sourceText,
		transcription: sourceTranscription,
		language: sourceLanguage,
		status: "idle",
		slot: startSlot + index,
		isVisible: true,
	};

	const targetCard: ActiveCard = {
		id: `tgt-${generateId()}-${index}`,
		wordKey,
		level,
		text: targetText,
		transcription: targetTranscription,
		language: targetLanguage,
		status: "idle",
		slot: startSlot + index,
		isVisible: true,
	};

	return { source: sourceCard, target: targetCard };
}

/**
 * Створює набір карток з масиву ключів слів.
 * Повертає об'єкт з перемішаними списками вихідних та цільових карток.
 *
 * @param wordKeys Масив унікальних ідентифікаторів слів
 * @param sourceLanguage Вихідна мова
 * @param targetLanguage Цільова мова
 * @param interfaceLanguage Мова інтерфейсу
 * @param sourceTranslations Словник перекладів для вихідної мови
 * @param targetTranslations Словник перекладів для цільової мови
 * @param sourceTranscriptions Словник транскрипцій для вихідної мови
 * @param targetTranscriptions Словник транскрипцій для цільової мови
 * @param wordLevels Мапа ключів слів до їх рівнів
 * @param startSlot Початковий номер слота для позиціонування
 */
export function createCardsFromWordKeys(
	wordKeys: string[],
	sourceLanguage: Language,
	targetLanguage: Language,
	interfaceLanguage: Language,
	sourceTranslations: TranslationDictionary,
	targetTranslations: TranslationDictionary,
	sourceTranscriptions: TranscriptionDictionary,
	targetTranscriptions: TranscriptionDictionary,
	wordLevels: Record<string, string> = {},
	startSlot: number = 0,
): { source: ActiveCard[]; target: ActiveCard[] } {
	const sourceList: ActiveCard[] = [];
	const targetList: ActiveCard[] = [];

	wordKeys.forEach((wordKey, index) => {
		const { source, target } = createCardPair(
			wordKey,
			index,
			startSlot,
			sourceLanguage,
			targetLanguage,
			interfaceLanguage,
			sourceTranslations,
			targetTranslations,
			sourceTranscriptions,
			targetTranscriptions,
			wordLevels[wordKey],
		);
		sourceList.push(source);
		targetList.push(target);
	});

	return { source: shuffle(sourceList), target: shuffle(targetList) };
}
