/**
 * Settings Store — SSoT для налаштувань додатку
 * Svelte 5 Runes + localStorage persistence
 */

import { browser } from '$app/environment';
import {
    ALL_LEVELS,
    ALL_TOPICS,
    type Language,
    type CEFRLevel,
    type GameMode,
    type AppTheme
} from '../types';

const STORAGE_KEY = 'wordApp_settings';

/** Типи налаштувань */
export interface AppSettings {
    // Тема оформлення
    theme: AppTheme;

    // Мова інтерфейсу
    interfaceLanguage: Language;

    // Мови для карток (пара)
    sourceLanguage: Language; // "з якої"
    targetLanguage: Language; // "на яку"

    // Показувати транскрипцію (для англійської)
    showTranscription: boolean;

    // Озвучувати англійські слова
    enablePronunciation: boolean;

    // Поточний режим
    mode: GameMode;

    // Поточний вибір
    currentLevel: CEFRLevel;
    currentTopic: string | null;
}

/** Значення за замовчуванням */
const DEFAULT_SETTINGS: AppSettings = {
    theme: 'dark-gray',
    interfaceLanguage: 'uk',
    sourceLanguage: 'en',
    targetLanguage: 'uk',
    showTranscription: true,
    enablePronunciation: true,
    mode: 'levels',
    currentLevel: 'A1',
    currentTopic: null
};

function createSettingsStore() {
    // Завантажити з localStorage або використати default
    let settings = $state<AppSettings>(loadSettings());

    // Застосувати тему при ініціалізації
    if (browser) {
        document.documentElement.setAttribute('data-theme', settings.theme);
        document.documentElement.style.colorScheme = 'dark';
    }

    function loadSettings(): AppSettings {
        if (!browser) return DEFAULT_SETTINGS;

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Migration: purple -> orange
                if (parsed.theme === 'purple') {
                    parsed.theme = 'orange';
                }
                return { ...DEFAULT_SETTINGS, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
        return DEFAULT_SETTINGS;
    }

    function saveSettings() {
        if (browser) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        }
    }

    return {
        get value() {
            return settings;
        },

        /** Оновити налаштування */
        update(partial: Partial<AppSettings>) {
            settings = { ...settings, ...partial };
            saveSettings();
        },

        /** Встановити тему */
        setTheme(theme: AppTheme) {
            settings = { ...settings, theme };
            saveSettings();
            if (browser) {
                document.documentElement.setAttribute('data-theme', theme);
                document.documentElement.style.colorScheme = 'dark';
            }
        },

        /** Встановити мову інтерфейсу */
        setInterfaceLanguage(lang: Language) {
            settings = { ...settings, interfaceLanguage: lang };
            saveSettings();
        },

        /** Встановити пару мов для карток */
        setCardLanguages(source: Language, target: Language) {
            if (source === target) {
                console.warn('Source and target languages must be different');
                return;
            }
            settings = { ...settings, sourceLanguage: source, targetLanguage: target };
            saveSettings();
        },

        /** Toggle транскрипції */
        toggleTranscription() {
            settings = { ...settings, showTranscription: !settings.showTranscription };
            saveSettings();
        },

        /** Toggle озвучування */
        togglePronunciation() {
            settings = { ...settings, enablePronunciation: !settings.enablePronunciation };
            saveSettings();
        },

        /** Перейти до рівня */
        setLevel(level: CEFRLevel) {
            settings = { ...settings, mode: 'levels', currentLevel: level, currentTopic: null };
            saveSettings();
        },

        /** Перейти до теми */
        setTopic(topic: string) {
            settings = { ...settings, mode: 'topics', currentTopic: topic };
            saveSettings();
        },

        /** Наступний елемент (рівень або тема) */
        nextLevel() {
            if (settings.mode === 'levels') {
                const idx = ALL_LEVELS.indexOf(settings.currentLevel);
                if (idx < ALL_LEVELS.length - 1) {
                    this.setLevel(ALL_LEVELS[idx + 1]);
                }
            } else {
                // Mode: topics
                const currentTopicId = settings.currentTopic || ALL_TOPICS[0].id;
                const idx = ALL_TOPICS.findIndex(t => t.id === currentTopicId);
                if (idx < ALL_TOPICS.length - 1) {
                    this.setTopic(ALL_TOPICS[idx + 1].id);
                }
            }
        },

        /** Попередній елемент (рівень або тема) */
        prevLevel() {
            if (settings.mode === 'levels') {
                const idx = ALL_LEVELS.indexOf(settings.currentLevel);
                if (idx > 0) {
                    this.setLevel(ALL_LEVELS[idx - 1]);
                }
            } else {
                // Mode: topics
                const currentTopicId = settings.currentTopic || ALL_TOPICS[0].id;
                const idx = ALL_TOPICS.findIndex(t => t.id === currentTopicId);
                if (idx > 0) {
                    this.setTopic(ALL_TOPICS[idx - 1].id);
                }
            }
        },

        /** Скинути до default */
        reset() {
            settings = { ...DEFAULT_SETTINGS };
            saveSettings();
        }
    };
}

export const settingsStore = createSettingsStore();
