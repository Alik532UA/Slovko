/**
 * Speech Service — озвучування англійських слів через Web Speech API
 */

import { browser } from '$app/environment';
import { settingsStore } from '../stores/settingsStore.svelte';




/**
 * Ініціалізація голосу
 */
function initVoice(): void {
    if (!browser || !window.speechSynthesis) return;

    // Отримуємо список голосів
    const loadVoices = () => {
        // У цьому варіанті ми не кешуємо конкретний голос наперед,
        // бо мова може змінюватись. Просто переконуємось що вони завантажені.
        window.speechSynthesis.getVoices();
    };

    // Голоси можуть завантажуватись асинхронно
    if (window.speechSynthesis.getVoices().length > 0) {
        loadVoices();
    } else {
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }
}

/**
 * Озвучити текст заданою мовою
 */
export function speakText(text: string, lang: string): void {
    if (!browser || !window.speechSynthesis) return;

    // Зупиняємо попереднє озвучування
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Спробуємо знайти відповідний голос
    const voices = window.speechSynthesis.getVoices();

    // 1. Точний збіг (наприклад 'uk-UA')
    let voice = voices.find(v => v.lang === lang);

    // 2. Частковий збіг (наприклад 'uk' -> 'uk-UA')
    if (!voice) {
        voice = voices.find(v => v.lang.startsWith(lang));
    }

    // 3. Fallback: використовуємо дефолтний голос браузера для цієї мови (якщо utterance.lang підтримується)
    // Встановлюємо lang в utterance, навіть якщо голос не знайдено явно
    utterance.lang = lang;

    if (voice) {
        utterance.voice = voice;
    }

    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
}

/**
 * Legacy support / Alias (optional, or just remove)
 */
export function speakEnglish(text: string): void {
    speakText(text, 'en');
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
