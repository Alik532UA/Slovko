import { progressStore } from '../stores/progressStore.svelte';
import { playlistStore } from '../stores/playlistStore.svelte';
import type { WordPair } from '../types';

/**
 * Game Feedback Handler - Handles external side effects of game events.
 * Decouples the game engine from specific stores (progress, playlists).
 */
export class GameFeedbackHandler {

    /**
     * Handle a correct match event.
     * Records progress and updates playlists.
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
     * Handle a wrong match event.
     * Records mistake and updates playlists.
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
