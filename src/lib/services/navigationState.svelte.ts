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
     */
    openModal(modalId: string, tabId?: string) {
        const url = new URL(this.getUrl());
        url.searchParams.set("modal", modalId);
        if (tabId) {
            url.searchParams.set("tab", tabId);
        } else {
            // Якщо таб не передано, очищаємо старий, щоб модалка відкрилась з дефолтним
            url.searchParams.delete("tab");
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
        url.searchParams.delete("subtab");
        goto(url, { keepFocus: true, noScroll: true });
    }
}

export const navigationState = new NavigationState();
