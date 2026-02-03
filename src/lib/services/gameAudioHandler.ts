import { speakText } from './speechService';
import { settingsStore } from '../stores/settingsStore.svelte';
import type { ActiveCard } from '../types';

/**
 * Game Audio Handler - Handles all audio feedback for the game.
 * Decouples audio logic from the game state.
 */
export class GameAudioHandler {
    /**
     * Play audio for a correct match.
     * Respects user settings for source/target pronunciation.
     */
    playMatch(card1: ActiveCard, card2: ActiveCard) {
        // Access store value non-reactively (snapshot)
        const { sourceLanguage, targetLanguage, enablePronunciationSource, enablePronunciationTarget } = settingsStore.value;

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
    }
}

export const gameAudioHandler = new GameAudioHandler();
