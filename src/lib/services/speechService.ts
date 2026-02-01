/**
 * Speech Service — озвучування слів через Web Speech API
 */

import { browser } from '$app/environment';
import { settingsStore } from '../stores/settingsStore.svelte';

// Маппінг мов до пріоритетних голосів
const LANGUAGE_VOICE_PRIORITIES: Record<string, string[]> = {
    'uk': ['uk-UA', 'uk'],
    'en': ['en-US', 'en-GB', 'en'],
    'nl': ['nl-NL', 'nl'], // nl-NL пріоритетніше ніж nl-BE
    'de': ['de-DE', 'de-AT', 'de'],
    'crh': ['tr-TR', 'tr', 'az-AZ', 'az'], // Кримськотатарська: fallback на турецьку або азербайджанську
};

/**
 * Ініціалізація голосу
 */
function initVoice(): void {
    if (!browser || !window.speechSynthesis) return;

    const loadVoices = () => {
        window.speechSynthesis.getVoices();
    };

    if (window.speechSynthesis.getVoices().length > 0) {
        loadVoices();
    } else {
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }
}

/**
 * Знаходить найкращий голос для мови
 */
export function findBestVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
    const priorities = LANGUAGE_VOICE_PRIORITIES[lang];

    if (priorities) {
        // Шукаємо по пріоритетному списку
        for (const priority of priorities) {
            // Точний збіг
            let voice = voices.find((v) => v.lang === priority);
            if (voice) return voice;

            // Частковий збіг (prefix)
            voice = voices.find((v) => v.lang.startsWith(priority));
            if (voice) return voice;
        }
    }

    // Стандартний пошук
    let voice = voices.find((v) => v.lang === lang);
    if (voice) return voice;

    voice = voices.find((v) => v.lang.startsWith(lang));
    return voice;
}

/**
 * Озвучити текст заданою мовою
 */
export function speakText(text: string, lang: string): void {
    if (!browser || !window.speechSynthesis) return;

    // Зупиняємо попереднє озвучування
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    let voice: SpeechSynthesisVoice | undefined;

    // 0. Перевіряємо збережені налаштування користувача
    const prefs = settingsStore.value.voicePreferences;
    const preferredURI = prefs ? prefs[lang] : undefined;

    if (preferredURI) {
        voice = voices.find((v) => v.voiceURI === preferredURI);
    }

    // 1. Якщо немає збереженого - шукаємо найкращий за пріоритетами
    if (!voice) {
        voice = findBestVoice(voices, lang);
    }

    // Встановлюємо мову utterance (для CRH використовуємо турецьку)
    if (lang === 'crh') {
        utterance.lang = voice?.lang || 'tr';
    } else {
        utterance.lang = voice?.lang || lang;
    }

    if (voice) {
        utterance.voice = voice;
    }

    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
}

/**
 * Legacy support
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
