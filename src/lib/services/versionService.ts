import { versionStore } from "../stores/versionStore.svelte";
import { base } from "$app/paths";

const VERSION_URL = `${base}/app-version.json`;
const STORAGE_KEY = "app_version";

/**
 * Сервіс для перевірки оновлень
 */
export async function checkForUpdates() {
    try {
        // Додаємо timestamp щоб уникнути кешування
        const response = await fetch(`${VERSION_URL}?v=${Date.now()}`);
        if (!response.ok) return;

        const data = await response.json();
        const serverVersion = data.version;

        const localVersion = localStorage.getItem(STORAGE_KEY);

        versionStore.setVersion(serverVersion);

        if (!localVersion) {
            // Перший візит
            localStorage.setItem(STORAGE_KEY, serverVersion);
        } else if (localVersion !== serverVersion) {
            // Є оновлення
            versionStore.setUpdate(true);
        }
    } catch (error) {
        console.error("Failed to check for updates:", error);
    }
}

/**
 * Виконує оновлення (застосовує нову версію)
 */
export async function applyUpdate() {
    if (versionStore.currentVersion) {
        const nextVersion = versionStore.currentVersion;

        try {
            // 1. Очищення Service Workers
            if ("serviceWorker" in navigator) {
                const registrations =
                    await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }

            // 2. Очищення Cache API
            if ("caches" in window) {
                const keys = await caches.keys();
                for (let key of keys) {
                    await caches.delete(key);
                }
            }
        } catch (e) {
            console.error("Failed to clear caches:", e);
        }

        // 3. Очищення localStorage (зберігаємо лише нову версію)
        // Це скине налаштування користувача, але гарантує чистоту
        localStorage.clear();
        localStorage.setItem(STORAGE_KEY, nextVersion);

        // 4. Перезавантаження
        window.location.reload();
    }
}
