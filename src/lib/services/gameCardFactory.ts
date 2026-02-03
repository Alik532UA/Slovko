/**
 * Game Card Factory - Factory Pattern for creating game cards
 * Isolates the logic of card creation, transcription generation, and shuffling.
 */
import type { ActiveCard, Language, TranslationDictionary, TranscriptionDictionary } from '../types';
import { getTranslation, getTranscription } from '../data/wordService';
import { generateRulesIPA } from './transcriptionService';
import { convertIPAToTarget } from './phoneticsService';

/**
 * Generates a unique ID for cards
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Fisher-Yates shuffle algorithm
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
 * Creates a pair of cards (Source and Target) for a given word key.
 * Handles IPA generation and alphabet conversion.
 */
function createCardPair(
    wordKey: string,
    index: number,
    startSlot: number,
    sourceLanguage: Language,
    targetLanguage: Language,
    sourceTranslations: TranslationDictionary,
    targetTranslations: TranslationDictionary,
    sourceTranscriptions: TranscriptionDictionary,
    targetTranscriptions: TranscriptionDictionary
): { source: ActiveCard; target: ActiveCard } {
    const sourceText = getTranslation(wordKey, sourceTranslations, sourceLanguage);
    const targetText = getTranslation(wordKey, targetTranslations, targetLanguage);

    // Helper for transcription generation
    const getProcessedTranscription = (
        text: string,
        lang: Language,
        dict: TranscriptionDictionary,
        targetAlphabetLang: Language
    ): string | undefined => {
        let ipa = getTranscription(wordKey, dict, true);

        // If no dictionary IPA, generate on the fly
        if (!ipa) {
            ipa = generateRulesIPA(text, lang);
        }

        if (lang === 'en' && ipa) {
            return ipa; // English shows raw IPA
        } else if (ipa) {
            return convertIPAToTarget(ipa, targetAlphabetLang); // Convert IPA to Target language alphabet
        }
        return undefined;
    };

    const sourceTranscription = getProcessedTranscription(sourceText, sourceLanguage, sourceTranscriptions, targetLanguage);
    const targetTranscription = getProcessedTranscription(targetText, targetLanguage, targetTranscriptions, sourceLanguage);

    const sourceCard: ActiveCard = {
        id: `src-${generateId()}-${index}`,
        wordKey,
        text: sourceText,
        transcription: sourceTranscription,
        language: sourceLanguage,
        status: 'idle',
        slot: startSlot + index,
        isVisible: true
    };

    const targetCard: ActiveCard = {
        id: `tgt-${generateId()}-${index}`,
        wordKey,
        text: targetText,
        transcription: targetTranscription,
        language: targetLanguage,
        status: 'idle',
        slot: startSlot + index,
        isVisible: true
    };

    return { source: sourceCard, target: targetCard };
}

/**
 * Creates cards from a list of word keys.
 * Returns shuffled source and target cards.
 */
export function createCardsFromWordKeys(
    wordKeys: string[],
    sourceLanguage: Language,
    targetLanguage: Language,
    sourceTranslations: TranslationDictionary,
    targetTranslations: TranslationDictionary,
    sourceTranscriptions: TranscriptionDictionary,
    targetTranscriptions: TranscriptionDictionary,
    startSlot: number = 0
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
            sourceTranslations,
            targetTranslations,
            sourceTranscriptions,
            targetTranscriptions
        );
        sourceList.push(source);
        targetList.push(target);
    });

    return { source: shuffle(sourceList), target: shuffle(targetList) };
}
