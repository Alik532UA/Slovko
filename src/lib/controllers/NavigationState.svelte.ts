import { goto } from "$app/navigation";
import { page } from "$app/stores";
import { get } from "svelte/store";

/**
 * Керує станом UI (модалки, таби) через URL Search Params.
 * Це гарантує, що при оновленні сторінки (F5) стан збережеться.
 */
class NavigationState {
    /** Отримує поточний об'єкт URL зі SvelteKit стору */
    private getUrl(): URL {
        return get(page).url;
    }

    /**
     * Відкрити глобальну модалку і (опціонально) змінити активний таб.
     * @param modalId Ідентифікатор модалки (profile, levels, menu, etc.)
     * @param tabId Ідентифікатор вкладки (stats, friends, etc.)
     * @param mode Режим відображення (наприклад, для профілю: full, stats, profile)
     */
    openModal(modalId: string, tabId?: string, mode?: string) {
        const url = new URL(this.getUrl());
        url.searchParams.set("modal", modalId);
        
        if (tabId) {
            url.searchParams.set("tab", tabId);
        } else {
            url.searchParams.delete("tab");
        }

        if (mode) {
            url.searchParams.set("mode", mode);
        } else {
            url.searchParams.delete("mode");
        }

        goto(url, { keepFocus: true, noScroll: true });
    }

    /**
     * Змінити поточний таб без закриття поточної модалки.
     * @param tabId Ідентифікатор вкладки
     */
    setTab(tabId: string) {
        const url = new URL(this.getUrl());
        url.searchParams.set("tab", tabId);
        goto(url, { keepFocus: true, noScroll: true });
    }

    /**
     * Змінити поточний суб-таб (наприклад для друзів: following/followers/search).
     * @param subTabId Ідентифікатор суб-вкладки
     */
    setSubTab(subTabId: string) {
        const url = new URL(this.getUrl());
        url.searchParams.set("subtab", subTabId);
        goto(url, { keepFocus: true, noScroll: true });
    }

    /**
     * Закрити поточну модалку, очистивши її конфігурацію з URL.
     */
    closeModal() {
        const url = new URL(this.getUrl());
        url.searchParams.delete("modal");
        url.searchParams.delete("tab");
        url.searchParams.delete("mode");
        url.searchParams.delete("subtab");
        goto(url, { keepFocus: true, noScroll: true });
    }
}

export const navigationState = new NavigationState();
