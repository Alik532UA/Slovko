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
     * @param fromMistakesPlaylist Чи була гра запущена з плейліста помилок
     * 
     * Дії:
     * 1. Оновлює загальну статистику правильних відповідей у progressStore.
     * 2. Якщо це плейліст помилок — повідомляє playlistStore про успішне повторення.
     */
    handleCorrect(wordKey: string, fromMistakesPlaylist: boolean) {
        // Record general progress
        progressStore.recordCorrect(wordKey);

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
     * 
     * Дії:
     * 1. Фіксує помилку в загальному progressStore для оновлення Streak та Accuracy.
     * 2. Додає обидва слова в плейліст помилок для подальшого повторення.
     */
    handleWrong(pair1: WordPair, pair2: WordPair) {
        // Record general mistake
        progressStore.recordWrong();

        // Add to mistakes playlist
        playlistStore.recordMistake(pair1);
        playlistStore.recordMistake(pair2);
    }
}

export const gameFeedbackHandler = new GameFeedbackHandler();
