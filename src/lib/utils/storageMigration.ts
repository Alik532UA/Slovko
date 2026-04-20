const STORAGE_PREFIX = 'slovko_';
const MIGRATION_KEY = STORAGE_PREFIX + '__migrated_v1';

// Міграція wordApp_ → slovko_
const WORD_APP_MIGRATION: Record<string, string> = {
    'wordApp_interfaceLanguage': 'slovko_interfaceLanguage',
    'wordApp_settings': 'slovko_settings',
    'wordApp_progress': 'slovko_progress',
    'wordApp_daily_activity': 'slovko_daily_activity',
    'wordApp_playlists_v2': 'slovko_playlists_v2',
    'wordApp_playlists': 'slovko_playlists',
};

// Міграція ключів без префіксу → slovko_
const UNPREFIXED_MIGRATION: Record<string, string> = {
    'app_cache_version': 'slovko_app_cache_version',
    'app_update_refused_version': 'slovko_app_update_refused_version',
    'app_update_refused_at': 'slovko_app_update_refused_at',
};

/**
 * Мігрує дані зі старих ключів (wordApp_* та без префіксів) на нові (slovko_*)
 */
export function migrateStorageKeys() {
    if (typeof window === 'undefined' || localStorage.getItem(MIGRATION_KEY)) return;

    const allMigrations = { ...WORD_APP_MIGRATION, ...UNPREFIXED_MIGRATION };
    let migratedCount = 0;

    for (const [oldKey, newKey] of Object.entries(allMigrations)) {
        const oldValue = localStorage.getItem(oldKey);
        if (oldValue !== null) {
            // Копіюємо дані в новий ключ, якщо він ще не зайнятий
            if (localStorage.getItem(newKey) === null) {
                localStorage.setItem(newKey, oldValue);
                migratedCount++;
            }
            // Видаляємо старий ключ
            localStorage.removeItem(oldKey);
        }
    }
    
    localStorage.setItem(MIGRATION_KEY, 'true');
    if (migratedCount > 0) {
        console.log(`[Storage Migration] Migrated ${migratedCount} keys to 'slovko_' prefix.`);
    }
}
