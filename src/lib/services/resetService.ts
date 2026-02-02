/**
 * Reset Service — Повне очищення даних додатка
 */
export async function hardReset(askConfirmation = true) {
    if (askConfirmation && !confirm("Це видалить ВСІ локальні дані, кукі та кеш. Продовжити?")) {
        return;
    }

    // 1. Clear Service Worker
    if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
            await registration.unregister();
        }
    }

    // 2. Clear Caches
    if ("caches" in window) {
        const keys = await caches.keys();
        for (const key of keys) {
            await caches.delete(key);
        }
    }

    // 3. Clear Local Storage & Session Storage
    localStorage.clear();
    sessionStorage.clear();

    // 4. Clear Cookies
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }

    // 5. Force Reload
    window.location.reload();
}
