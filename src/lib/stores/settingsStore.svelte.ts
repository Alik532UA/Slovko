/**
 * Settings Store — SSoT для налаштувань додатку
 * Svelte 5 Runes + localStorage persistence
 */

import { browser } from '$app/environment';
import { SyncService } from '../firebase/SyncService';
import { localStorageProvider } from '../services/storage/storageProvider';
import { z } from 'zod';
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

// Zod Schema for validation and defaults
export const AppSettingsSchema = z.object({
    interfaceLanguage: z.enum(['en', 'uk', 'nl', 'de', 'el', 'crh']).default('en'),
    sourceLanguage: z.enum(['en', 'uk', 'nl', 'de', 'el', 'crh']).default('en'),
    targetLanguage: z.enum(['en', 'uk', 'nl', 'de', 'el', 'crh']).default('uk'),
    mode: z.enum(['levels', 'topics', 'phrases', 'playlists']).default('levels'),
    currentLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).default('A1'),
    currentTopic: z.string().default('basic_verbs'),
    currentPlaylist: z.enum(['favorites', 'mistakes', 'extra']).nullable().default(null),
    hasCompletedOnboarding: z.boolean().default(false),
    enablePronunciationSource: z.boolean().default(true),
    enablePronunciationTarget: z.boolean().default(false),
    showTranscriptionSource: z.boolean().default(true),
    showTranscriptionTarget: z.boolean().default(false),
    voicePreferences: z.record(z.string(), z.string()).default({}),
    theme: z.enum(['dark-gray', 'light-gray', 'orange', 'green']).default('dark-gray'),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

const DEFAULT_SETTINGS: AppSettings = AppSettingsSchema.parse({});

function createSettingsStore() {
    let settings = $state<AppSettings>(loadSettings());

    function loadSettings(): AppSettings {
        if (!browser) return DEFAULT_SETTINGS;

        try {
            const stored = localStorageProvider.getItem(STORAGE_KEY);
            const hasAppVersion = !!localStorageProvider.getItem('app_cache_version');

            if (stored) {
                let parsed = JSON.parse(stored);
                
                // Legacy migrations
                if (parsed.theme === 'purple') parsed.theme = 'orange';
                
                if ('enablePronunciation' in parsed) {
                    parsed.enablePronunciationSource = parsed.enablePronunciation;
                    delete parsed.enablePronunciation;
                }

                if ('showTranscription' in parsed) {
                    parsed.showTranscriptionSource = parsed.showTranscription;
                    delete parsed.showTranscription;
                }

                // Validate with Zod
                const result = AppSettingsSchema.safeParse(parsed);
                
                if (result.success) {
                    let validated = result.data as AppSettings;
                    if (hasAppVersion) {
                        validated.hasCompletedOnboarding = true;
                    }
                    return validated;
                } else {
                    console.warn('Invalid settings found, using defaults with partial fix:', result.error);
                    // Fallback to defaults merged with whatever was valid
                    return { ...DEFAULT_SETTINGS, ...parsed } as AppSettings; 
                }
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
        return DEFAULT_SETTINGS;
    }

    function saveSettings() {
        if (browser) {
            localStorageProvider.setItem(STORAGE_KEY, JSON.stringify(settings));
            SyncService.uploadAll();
        }
    }

    return {
        get value() { return settings; },

        /** Internal update for SyncService to avoid infinite loops */
        _internalUpdate(newData: Partial<AppSettings>) {
            settings = { ...settings, ...newData };
            if (browser) {
                localStorageProvider.setItem(STORAGE_KEY, JSON.stringify(settings));
            }
        },

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
            const currentIndex = ALL_LEVELS.indexOf(settings.currentLevel as CEFRLevel);
            if (currentIndex < ALL_LEVELS.length - 1) {
                this.setLevel(ALL_LEVELS[currentIndex + 1]);
            }
        },

        prevLevel() {
            const currentIndex = ALL_LEVELS.indexOf(settings.currentLevel as CEFRLevel);
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