/**
 * Firestore Types - типи для документів Firestore
 * Забезпечує type-safety при роботі з базою даних
 */

import type { Timestamp } from "firebase/firestore";

/** Прогрес вивчення слова */
export interface WordProgressData {
    correctCount: number;
    wrongCount: number;
    lastSeen: number;
}

/** Загальний прогрес користувача */
export interface UserProgressData {
    words: Record<string, WordProgressData>;
    totalCorrect: number;
    totalAttempts: number;
    lastUpdated: number;
    streak: number;
    lastCorrectDate: string | null;
    dailyCorrect: number;
    firstSeenDate: number;
}

/** Налаштування додатку */
export interface UserSettingsData {
    sourceLanguage: string;
    targetLanguage: string;
    mode: 'levels' | 'topics' | 'phrases' | 'playlists';
    currentLevel: string;
    currentTopic: string;
    currentPlaylist: string | null;
    showTranscription: boolean;
    enablePronunciationSource: boolean;
    enablePronunciationTarget: boolean;
    theme: string;
}

/** Пара слів у плейлісті */
export interface PlaylistWordPair {
    id: string;
    english?: string;
    ukrainian?: string;
}

/** Помилка в плейлісті */
export interface PlaylistMistake {
    pair: PlaylistWordPair;
    count: number;
}

/** Плейлісти користувача */
export interface UserPlaylistsData {
    favorites: PlaylistWordPair[];
    extra: PlaylistWordPair[];
    mistakes: PlaylistMistake[];
}

/** Аватар користувача (внутрішній формат) */
export interface AvatarData {
    icon: string;
    color: string;
}

/** Документ користувача в Firestore */
export interface UserDocument {
    settings?: UserSettingsData;
    progress?: UserProgressData;
    playlists?: UserPlaylistsData;
    avatar?: AvatarData | null;
    lastSync?: number;
}

/** Публічний профіль для пошуку */
export interface PublicProfileDocument {
    displayName: string;
    photoURL: string | null;
    searchableEmail: string | null;
    updatedAt: Timestamp;
}

/** Запис підписки */
export interface FollowDocument {
    uid: string;
    displayName: string;
    photoURL: string | null;
    followedAt: Timestamp;
}

/** Статуси синхронізації */
export interface SyncStatus {
    isOnline: boolean;
    isUploading: boolean;
    isDownloading: boolean;
    lastSync: number;
    retryCount: number;
}
