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
    type AppTheme,
    type PlaylistId
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

    // Показувати транскрипцію (окремо для кожної сторони)
    showTranscriptionSource: boolean;
    showTranscriptionTarget: boolean;

    // Озвучувати слова (окремо для кожної сторони)
    enablePronunciationSource: boolean;
    enablePronunciationTarget: boolean;

    // Поточний режим
    mode: GameMode;

    // Поточний вибір
    currentLevel: CEFRLevel;
    currentTopic: string | null;
    currentPlaylist: PlaylistId | null;

    // Збережені голоси для мов (Language code -> VoiceURI)
    voicePreferences: Record<string, string>;
}

/** Значення за замовчуванням */
const DEFAULT_SETTINGS: AppSettings = {
    theme: 'dark-gray',
    interfaceLanguage: 'uk',
    sourceLanguage: 'en',
    targetLanguage: 'uk',
    showTranscriptionSource: true,
    showTranscriptionTarget: false,
    enablePronunciationSource: true,
    enablePronunciationTarget: false, // За замовчуванням тільки джерело (usually EN)
    mode: 'levels',
    currentLevel: 'A1',
    currentTopic: null,
    currentPlaylist: null,
    voicePreferences: {}
};

function createSettingsStore() {
    // Завантажити з localStorage або використати default
    let settings = $state<AppSettings>(loadSettings());

    // ... (rest of init)

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

                let migrated = { ...DEFAULT_SETTINGS, ...parsed };

                // Ensure voicePreferences exists (migration)
                if (!migrated.voicePreferences) {
                    migrated.voicePreferences = {};
                }

                // Migration: enablePronunciation -> enablePronunciationSource
                if ('enablePronunciation' in parsed) {
                    migrated.enablePronunciationSource = parsed.enablePronunciation;
                    migrated.enablePronunciationTarget = false;
                    delete migrated.enablePronunciation;
                }

                // Migration: showTranscription -> showTranscriptionSource
                if ('showTranscription' in parsed) {
                    migrated.showTranscriptionSource = parsed.showTranscription;
                    migrated.showTranscriptionTarget = false;
                    delete migrated.showTranscription;
                }

                return migrated;
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

        // ... methods ...

        /** Зберегти бажаний голос для мови */
        setVoicePreference(lang: string, voiceURI: string) {
            settings = {
                ...settings,
                voicePreferences: { ...settings.voicePreferences, [lang]: voiceURI }
            };
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

        /** Toggle транскрипції джерела */
        toggleTranscriptionSource() {
            settings = { ...settings, showTranscriptionSource: !settings.showTranscriptionSource };
            saveSettings();
        },

        /** Toggle транскрипції цілі */
        toggleTranscriptionTarget() {
            settings = { ...settings, showTranscriptionTarget: !settings.showTranscriptionTarget };
            saveSettings();
        },

        /** Toggle озвучування джерела */
        togglePronunciationSource() {
            settings = { ...settings, enablePronunciationSource: !settings.enablePronunciationSource };
            saveSettings();
        },

        /** Toggle озвучування цілі */
        togglePronunciationTarget() {
            settings = { ...settings, enablePronunciationTarget: !settings.enablePronunciationTarget };
            saveSettings();
        },

        /** Перейти до рівня (Words) */
        setLevel(level: CEFRLevel) {
            settings = { ...settings, mode: 'levels', currentLevel: level, currentTopic: null, currentPlaylist: null };
            saveSettings();
        },

        /** Перейти до рівня (Phrases) */
        setPhrasesLevel(level: CEFRLevel) {
            settings = { ...settings, mode: 'phrases', currentLevel: level, currentTopic: null, currentPlaylist: null };
            saveSettings();
        },

        /** Перейти до теми */
        setTopic(topic: string) {
            settings = { ...settings, mode: 'topics', currentTopic: topic, currentPlaylist: null };
            saveSettings();
        },

        /** Перейти до плейліста */
        setPlaylist(playlist: PlaylistId) {
            settings = { ...settings, mode: 'playlists', currentPlaylist: playlist, currentTopic: null };
            saveSettings();
        },

        /** Наступний елемент (рівень або тема) */
        nextLevel() {
            if (settings.mode === 'levels' || settings.mode === 'phrases') {
                const idx = ALL_LEVELS.indexOf(settings.currentLevel);
                if (idx < ALL_LEVELS.length - 1) {
                    if (settings.mode === 'phrases') {
                        this.setPhrasesLevel(ALL_LEVELS[idx + 1]);
                    } else {
                        this.setLevel(ALL_LEVELS[idx + 1]);
                    }
                }
            } else if (settings.mode === 'topics') {
                const currentTopicId = settings.currentTopic || ALL_TOPICS[0].id;
                const idx = ALL_TOPICS.findIndex(t => t.id === currentTopicId);
                if (idx < ALL_TOPICS.length - 1) {
                    this.setTopic(ALL_TOPICS[idx + 1].id);
                }
            }
        },

        /** Попередній елемент (рівень або тема) */
        prevLevel() {
            if (settings.mode === 'levels' || settings.mode === 'phrases') {
                const idx = ALL_LEVELS.indexOf(settings.currentLevel);
                if (idx > 0) {
                    if (settings.mode === 'phrases') {
                        this.setPhrasesLevel(ALL_LEVELS[idx - 1]);
                    } else {
                        this.setLevel(ALL_LEVELS[idx - 1]);
                    }
                }
            } else if (settings.mode === 'topics') {
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
