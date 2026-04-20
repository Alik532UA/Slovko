import { logService } from "./logService.svelte";
import { progressStore } from "../stores/progressStore.svelte";
import { playlistStore } from "../stores/playlistStore.svelte";
import { browser } from "$app/environment";
import type { WordPair } from "../types";

/**
 * Game Feedback Handler — Обробка ігрових подій (прогрес) та фідбек (звук/вібро)
 */
export class GameFeedbackHandler {
	private audioContext: AudioContext | null = null;

	/**
	 * Обробляє подію правильної відповіді.
	 */
	handleCorrect(
		wordKey: string,
		levelId: string,
		fromMistakesPlaylist: boolean,
	) {
		// Record general progress
		progressStore.recordCorrect(wordKey, levelId);

		// Update specific playlist if active
		if (fromMistakesPlaylist) {
			playlistStore.recordCorrect(wordKey);
		}
	}

	/**
	 * Обробляє подію неправильної відповіді.
	 */
	handleWrong(pair1: WordPair, pair2: WordPair, levelId: string) {
		// Record general mistake
		progressStore.recordWrong(levelId);

		// Add to mistakes playlist
		playlistStore.recordMistake(pair1.id);
		playlistStore.recordMistake(pair2.id);
	}

	/**
	 * Відтворює звук "Успіху" через Web Audio API
	 * @param volume Гучність (0.0 - 1.0)
	 */
	playSuccessSound(volume = 0.3) {
		if (!browser) return;

		try {
			if (!this.audioContext) {
				const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
				if (!AudioContextClass) return;
				this.audioContext = new AudioContextClass();
			}

			const ctx = this.audioContext;
			if (!ctx) return;

			if (ctx.state === 'suspended') {
				ctx.resume();
			}

			const oscillator = ctx.createOscillator();
			const gain = ctx.createGain();

			oscillator.type = 'sine';
			oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // До (C5)
			oscillator.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.1); // Ля (A5)

			gain.gain.setValueAtTime(volume, ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

			oscillator.connect(gain);
			gain.connect(ctx.destination);

			oscillator.start();
			oscillator.stop(ctx.currentTime + 0.4);
		} catch (e) {
			logService.warn("debug", "Failed to play success sound:", e);
		}
	}

	/**
	 * Тактильний відгук (якщо підтримується)
	 */
	vibrate(pattern = 50) {
		if (browser && navigator.vibrate) {
			try {
				navigator.vibrate(pattern);
			} catch (e) { /* ignore */ }
		}
	}
}

export const gameFeedbackHandler = new GameFeedbackHandler();
