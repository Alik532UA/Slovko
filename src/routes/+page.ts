import { gameDataService } from '$lib/services/gameDataService';
import { settingsStore } from '$lib/stores/settingsStore.svelte';
import { playlistStore } from '$lib/stores/playlistStore.svelte';
import type { PageLoad } from './$types';
import type { AppSettings } from '$lib/stores/settingsStore.svelte';

// Вимикаємо SSR, оскільки гра залежить від localStorage та клієнтської логіки
export const ssr = false;

export const load: PageLoad = async ({ url }) => {
    // Отримуємо поточні налаштування як базу
    const settings = settingsStore.value;

    // Створюємо копію для запиту даних
    const requestSettings: AppSettings = { ...settings };

    // Оновлюємо налаштування з URL параметрів (пріоритет URL)
    const mode = url.searchParams.get('mode');
    const level = url.searchParams.get('level');
    const topic = url.searchParams.get('topic');
    const playlist = url.searchParams.get('playlist');

    if (mode) requestSettings.mode = mode as any;
    if (level) requestSettings.currentLevel = level as any;
    if (topic) requestSettings.currentTopic = topic;
    if (playlist) requestSettings.currentPlaylist = playlist as any;

    // Отримуємо snapshot плейлістів
    const playlists = {
        favorites: playlistStore.favorites,
        extra: playlistStore.extra,
        mistakes: playlistStore.mistakes
    };

    try {
        const gameData = await gameDataService.loadGameData(requestSettings, playlists);
        return {
            gameData,
            gameSettings: requestSettings
        };
    } catch (e) {
        console.error('Failed to load game data inside load function', e);
        // Повертаємо пусті дані або кидаємо помилку, яку обробить error boundary
        throw e;
    }
};
