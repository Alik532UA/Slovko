import { progressStore } from '../stores/progressStore.svelte';
import { playlistStore } from '../stores/playlistStore.svelte';
import type { WordPair } from '../types';

/**
 * Сервіс для обробки побічних ефектів ігрових подій.
 * Використовується як міст між ігровим двигуном та сховищами прогресу/плейлістів.
 */
export class GameFeedbackHandler {

    /**
     * Обробляє подію правильної відповіді.
     * 
     * @param wordKey Унікальний ключ слова
     * @param levelId Поточний рівень (CEFR або ID теми)
     * @param fromMistakesPlaylist Чи була гра запущена з плейліста помилок
     */
    handleCorrect(wordKey: string, levelId: string, fromMistakesPlaylist: boolean) {
        // Record general progress
        progressStore.recordCorrect(wordKey, levelId);

        // Update specific playlist if active
        if (fromMistakesPlaylist) {
            playlistStore.recordCorrect(wordKey);
        }
    }

    /**
     * Обробляє подію неправильної відповіді.
     * 
     * @param pair1 Перша пара слів (ID та тексти)
     * @param pair2 Друга пара слів (ID та тексти)
     * @param levelId Поточний рівень (CEFR або ID теми)
     */
    handleWrong(pair1: WordPair, pair2: WordPair, levelId: string) {
        // Record general mistake
        progressStore.recordWrong(levelId);

        // Add to mistakes playlist
        playlistStore.recordMistake(pair1);
        playlistStore.recordMistake(pair2);
    }
}

export const gameFeedbackHandler = new GameFeedbackHandler();
