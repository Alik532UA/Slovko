import { versionStore } from "../stores/versionStore.svelte";
import { base } from "$app/paths";

const VERSION_URL = `${base}/version.json`;
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
export function applyUpdate() {
    if (versionStore.currentVersion) {
        localStorage.setItem(STORAGE_KEY, versionStore.currentVersion);
        window.location.reload();
    }
}
