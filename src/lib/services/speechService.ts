/**
 * Speech Service — озвучування англійських слів через Web Speech API
 */

import { browser } from '$app/environment';
import { settingsStore } from '../stores/settingsStore.svelte';

let speechSynthesis: SpeechSynthesis | null = null;
let englishVoice: SpeechSynthesisVoice | null = null;

/**
 * Ініціалізація голосу
 */
function initVoice(): void {
    if (!browser || !window.speechSynthesis) return;

    speechSynthesis = window.speechSynthesis;

    // Отримуємо список голосів
    const loadVoices = () => {
        const voices = speechSynthesis!.getVoices();
        // Шукаємо англійський голос (US або GB)
        englishVoice =
            voices.find((v) => v.lang === 'en-US') ||
            voices.find((v) => v.lang === 'en-GB') ||
            voices.find((v) => v.lang.startsWith('en')) ||
            null;
    };

    // Голоси можуть завантажуватись асинхронно
    if (speechSynthesis.getVoices().length > 0) {
        loadVoices();
    } else {
        speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }
}

/**
 * Озвучити текст англійською
 */
export function speakEnglish(text: string): void {
    if (!browser || !window.speechSynthesis) return;

    // Перевіряємо чи увімкнено озвучування
    if (!settingsStore.value.enablePronunciation) return;

    // Ініціалізуємо якщо ще не було
    if (!speechSynthesis) {
        initVoice();
        speechSynthesis = window.speechSynthesis;
    }

    // Зупиняємо попереднє озвучування
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // Трохи повільніше для кращого сприйняття
    utterance.pitch = 1;
    utterance.volume = 1;

    if (englishVoice) {
        utterance.voice = englishVoice;
    }

    speechSynthesis.speak(utterance);
}

/**
 * Зупинити озвучування
 */
export function stopSpeech(): void {
    if (browser && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

// Ініціалізуємо при імпорті
if (browser) {
    initVoice();
}
