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

export interface AppSettings {
    interfaceLanguage: Language;
    sourceLanguage: Language;
    targetLanguage: Language;
    mode: GameMode;
    currentLevel: CEFRLevel;
    currentTopic: string;
    currentPlaylist: PlaylistId | null;
    hasCompletedOnboarding: boolean;
    enablePronunciationSource: boolean;
    enablePronunciationTarget: boolean;
    showTranscriptionSource: boolean;
    showTranscriptionTarget: boolean;
    voicePreferences: Record<string, string>;
    theme: AppTheme;
}

const DEFAULT_SETTINGS: AppSettings = {
    interfaceLanguage: 'en',
    sourceLanguage: 'en',
    targetLanguage: 'uk',
    mode: 'levels',
    currentLevel: 'A1',
    currentTopic: 'basic_verbs',
    currentPlaylist: null,
    hasCompletedOnboarding: false,
    enablePronunciationSource: true,
    enablePronunciationTarget: false,
    showTranscriptionSource: true,
    showTranscriptionTarget: false,
    voicePreferences: {},
    theme: 'dark-gray'
};

function createSettingsStore() {
    let settings = $state<AppSettings>(loadSettings());

    function loadSettings(): AppSettings {
        if (!browser) return DEFAULT_SETTINGS;

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const hasAppVersion = !!localStorage.getItem('app_cache_version');

            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.theme === 'purple') parsed.theme = 'orange';

                let migrated = { ...DEFAULT_SETTINGS, ...parsed };

                // Якщо у користувача вже є маркер версії додатку, 
                // значить він вже був у додатку раніше — пропускаємо онбординг.
                if (hasAppVersion) {
                    migrated.hasCompletedOnboarding = true;
                }

                if (!migrated.voicePreferences) migrated.voicePreferences = {};

                if ('enablePronunciation' in parsed) {
                    migrated.enablePronunciationSource = parsed.enablePronunciation;
                    migrated.enablePronunciationTarget = false;
                    delete (migrated as any).enablePronunciation;
                }

                if ('showTranscription' in parsed) {
                    migrated.showTranscriptionSource = parsed.showTranscription;
                    migrated.showTranscriptionTarget = false;
                    delete (migrated as any).showTranscription;
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
        get value() { return settings; },

        update(partial: Partial<AppSettings>) {
            settings = { ...settings, ...partial };
            saveSettings();
        },

        setCardLanguages(source: Language, target: Language) {
            settings = { ...settings, sourceLanguage: source, targetLanguage: target };
            saveSettings();
        },

        setInterfaceLanguage(lang: Language) {
            settings = { ...settings, interfaceLanguage: lang };
            saveSettings();
        },

        setLevel(level: CEFRLevel) {
            settings = { ...settings, currentLevel: level, mode: 'levels' };
            saveSettings();
        },

        setPhrasesLevel(level: CEFRLevel) {
            settings = { ...settings, currentLevel: level, mode: 'phrases' };
            saveSettings();
        },

        setTopic(topicId: string) {
            settings = { ...settings, currentTopic: topicId, mode: 'topics' };
            saveSettings();
        },

        setPlaylist(playlistId: PlaylistId) {
            settings = { ...settings, currentPlaylist: playlistId, mode: 'playlists' };
            saveSettings();
        },

        nextLevel() {
            const currentIndex = ALL_LEVELS.indexOf(settings.currentLevel);
            if (currentIndex < ALL_LEVELS.length - 1) {
                this.setLevel(ALL_LEVELS[currentIndex + 1]);
            }
        },

        prevLevel() {
            const currentIndex = ALL_LEVELS.indexOf(settings.currentLevel);
            if (currentIndex > 0) {
                this.setLevel(ALL_LEVELS[currentIndex - 1]);
            }
        },

        togglePronunciationSource() {
            settings = { ...settings, enablePronunciationSource: !settings.enablePronunciationSource };
            saveSettings();
        },

        togglePronunciationTarget() {
            settings = { ...settings, enablePronunciationTarget: !settings.enablePronunciationTarget };
            saveSettings();
        },

        toggleTranscriptionSource() {
            settings = { ...settings, showTranscriptionSource: !settings.showTranscriptionSource };
            saveSettings();
        },

        toggleTranscriptionTarget() {
            settings = { ...settings, showTranscriptionTarget: !settings.showTranscriptionTarget };
            saveSettings();
        },

        setVoicePreference(lang: string, voiceURI: string) {
            settings = {
                ...settings,
                voicePreferences: { ...settings.voicePreferences, [lang]: voiceURI }
            };
            saveSettings();
        },

        setTheme(theme: AppTheme) {
            settings = { ...settings, theme };
            saveSettings();
        },

        completeOnboarding() {
            settings = { ...settings, hasCompletedOnboarding: true };
            saveSettings();
        }
    };
}

export const settingsStore = createSettingsStore();