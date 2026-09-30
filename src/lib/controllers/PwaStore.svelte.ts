/**
 * PwaStore — Керування станом встановлення (PWA)
 *
 * Подію `beforeinstallprompt` ловить скрипт першого кадру (`app.html`), а натиск її
 * показує через `services/pwa/installPrompt.ts`. Яку інструкцію показати там, де вікна
 * браузера немає, вирішує `services/pwa/installGuide.ts` — тут лише стан.
 */

import { browser } from "$app/environment";
import { logService } from "../services/logService.svelte";
import { guideFor, isMobileGuide, type Guide } from "../services/pwa/installGuide";
import { promptInstall, type InstallOutcome } from "../services/pwa/installPrompt";

class PwaStore {
	private _isInstalled = $state(false);

	/** Рядок браузера за сеанс не міняється — отже, й інструкція. */
	readonly guide: Guide = browser
		? guideFor(window.navigator.userAgent, window.navigator.maxTouchPoints)
		: "desktop";

	/**
	 * Слухач — один і тут: доти `init()` кликали і конструктор, і кореневий макет, тож
	 * `beforeinstallprompt` і `appinstalled` мали по два обробники, а зняти їх не було чим.
	 */
	constructor() {
		if (!browser) return;
		// `navigator.standalone` — нестандартний прапорець Safari, якого немає в
		// типах DOM. Точковий тип замість `any`: помилка в імені поля лишається
		// помилкою компіляції, а `any` вимкнув би перевірку всього виразу.
		const iosNavigator = window.navigator as Navigator & { standalone?: boolean };
		this._isInstalled =
			window.matchMedia("(display-mode: standalone)").matches || iosNavigator.standalone === true;

		window.addEventListener("appinstalled", () => {
			logService.log("ui", "PWA: App installed");
			this._isInstalled = true;
		});
	}

	get isInstalled() {
		return this._isInstalled;
	}
	get canInstall() {
		return !this._isInstalled;
	}
	/** Підпис кнопки: «Застосунок для телефону» чи «…для комп'ютера». */
	get isMobile() {
		return isMobileGuide(this.guide);
	}

	/** `unavailable` — вікна браузера немає, і кнопка відкриває кроки (`InstallGuide`). */
	install(): Promise<InstallOutcome> {
		return browser ? promptInstall() : Promise.resolve("unavailable");
	}
}

export const pwaStore = new PwaStore();
