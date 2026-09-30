import { logService } from "../logService.svelte";

/**
 * ВСТАНОВЛЕННЯ ОДНИМ НАТИСКОМ — там, де браузер це дає (канон FULLSCREEN-INSTALL § 4.3).
 *
 * ## Де воно є
 *
 * Лише в Chromium: Chrome, Edge, Samsung Internet, Opera — на Android і на комп'ютері. Коли
 * сайт придатний до встановлення (маніфест, значки), браузер кидає `beforeinstallprompt`, і
 * збережена подія потім показує ЙОГО ВЛАСНЕ вікно «Встановити» одним натиском. Safari
 * (iPhone, iPad, Mac) і Firefox такої події не мають — там `InstallGuide` показує кроки.
 *
 * ## Чому подію ловить скрипт першого кадру, а не цей модуль
 *
 * Подія приходить ОДИН раз, невдовзі після завантаження. Доти слухачів вішав `PwaStore` — і
 * двічі: конструктором і ще раз викликом `init()` з кореневого макета, тож журнал писав
 * подію двічі, а прибрати зайвого слухача не було чим. Тепер її ловить інлайн-скрипт
 * `app.html` — найраніше, що є, і однаково в dev та збірці — і кладе в
 * `window.__pwaInstallPrompt`. Тут лише читання.
 *
 * ## Ціна `preventDefault()`
 *
 * Без нього Chrome на Android сам показує внизу смужку «Додати на головний екран». З ним —
 * ні: встановлення пропонують кнопки застосунку (онбординг і «Про проєкт»).
 */

/** `beforeinstallprompt` — лише Chromium, у типах DOM його немає. */
interface InstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/** Що сталося з натиском «Встановити». `unavailable` — вікна браузера немає, потрібні кроки. */
export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

/** Сховок скрипта першого кадру (`app.html`). */
type Stash = Window & { __pwaInstallPrompt?: InstallPromptEvent | null };

/**
 * Показати вікно браузера.
 *
 * `prompt()` кличеться ДО першого `await`, тобто в тому самому натиску: без дії людини
 * браузер вікна не покаже. Подію можна показати лише раз — тому її забуто одразу.
 */
export async function promptInstall(): Promise<InstallOutcome> {
	const stash = window as Stash;
	const event = stash.__pwaInstallPrompt;
	if (!event) return "unavailable";
	stash.__pwaInstallPrompt = null;
	try {
		await event.prompt();
		const { outcome } = await event.userChoice;
		logService.info("ui", "PWA: install prompt answered", { outcome });
		return outcome;
	} catch (error) {
		logService.warn("ui", "PWA: install prompt failed", { reason: String(error) });
		return "unavailable";
	}
}
