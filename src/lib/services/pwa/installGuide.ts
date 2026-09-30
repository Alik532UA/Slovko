/**
 * ЯКУ ІНСТРУКЦІЮ ВСТАНОВЛЕННЯ ПОКАЗАТИ (канон FULLSCREEN-INSTALL § 5, product_criteria/v10).
 *
 * Чиста функція від рядка браузера й кількості точок дотику плюс ДАНІ кроків. Доти рішення
 * жило у двох місцях — `PwaStore` розрізняв «iOS / Android / решта», а `InstallGuide`
 * малював три гілки розмітки, — і правдивою інструкція була лише для iPhone і для Chrome чи
 * Edge на комп'ютері:
 *
 * - iPad у Safari звітує `Macintosh` і отримував кроки комп'ютера — «іконку встановлення в
 *   адресному рядку», якої в Safari немає. Відрізняє його лише `maxTouchPoints > 1`;
 * - Safari на Mac і Firefox отримували ту саму іконку, а в Safari це меню «Файл» → «Додати в
 *   Dock», у Firefox — порада відкрити Chrome чи Edge;
 * - Edge на Android трьох крапок не має: меню — три лінії внизу посередині, пункт «Додати на
 *   телефон» (перевірено на телефоні автора 2026-09-29);
 * - Chrome на Android перейменував пункт на «Установити й створити ярлик»;
 * - вбудований браузер месенджера сайтів не встановлює взагалі.
 *
 * Рядок браузера вибирає тут лише СЛОВА. Чи є вікно браузера «Встановити», вирішує подія
 * `beforeinstallprompt` (`installPrompt.ts`), а не назва.
 */

export type Guide =
	| "ios-safari"
	| "ios-chrome"
	| "ios-other"
	| "ipad-safari"
	| "android"
	| "android-edge"
	| "desktop"
	| "edge"
	| "mac-safari"
	| "firefox-desktop"
	| "in-app";

/** Значок кроку — назва, а не компонент: модуль лишається чистим і тестується без DOM. */
export type StepIcon =
	| "share"
	| "add"
	| "dots"
	| "menu"
	| "install"
	| "installEdge"
	| "dock"
	| "browser"
	| "phone"
	| "app";

export interface Step {
	/** Ключ словника `pwa.step.*`. */
	text: string;
	icon: StepIcon;
}

export interface GuideText {
	title: string;
	/** Що сказати перед кроками: для більшості — «одним натиском не можна». */
	note: string;
	steps: readonly Step[];
	warning?: string;
}

/**
 * Вбудовані браузери месенджерів. Telegram і WhatsApp тут немає: вони відкривають
 * посилання в системному переглядачі й своєї назви в рядку браузера не лишають.
 */
const IN_APP =
	/FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|BytedanceWebview|Snapchat|LinkedInApp|Pinterest/i;

/**
 * Порядок перевірок — частина правила: месенджер раніше за iPhone (Instagram на iPhone —
 * це iPhone у рядку), Android раніше за Firefox (Firefox на Android встановлює з меню).
 */
export function guideFor(userAgent: string, maxTouchPoints: number): Guide {
	if (IN_APP.test(userAgent)) return "in-app";
	const iPad = /iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
	if (iPad || /iPhone|iPod/.test(userAgent)) {
		if (/CriOS/.test(userAgent)) return "ios-chrome";
		if (/FxiOS|EdgiOS|OPiOS/.test(userAgent)) return "ios-other";
		return iPad ? "ipad-safari" : "ios-safari";
	}
	if (/Android/.test(userAgent)) return /EdgA\//.test(userAgent) ? "android-edge" : "android";
	if (/Firefox\//.test(userAgent)) return "firefox-desktop";
	if (/Edg\//.test(userAgent)) return "edge";
	if (/Macintosh/.test(userAgent) && !/Chrome|Chromium|OPR/.test(userAgent)) return "mac-safari";
	return "desktop";
}

/** Інструкції для комп'ютера — кнопка тоді підписана «Застосунок для комп'ютера». */
const DESKTOP_GUIDES: ReadonlySet<Guide> = new Set(["desktop", "edge", "mac-safari", "firefox-desktop"]);

export const isMobileGuide = (guide: Guide): boolean => !DESKTOP_GUIDES.has(guide);

const MANUAL = "pwa.note.manual";
const ADD_HOME: Step = { text: "pwa.step.addHome", icon: "add" };
const OPEN_HOME: Step = { text: "pwa.step.openHome", icon: "phone" };
const CONFIRM: Step = { text: "pwa.step.confirm", icon: "add" };
const OPEN_APP: Step = { text: "pwa.step.openApp", icon: "app" };

/**
 * Останній крок кожної інструкції встановлення — «відкривайте значком»: людина, що додала
 * значок і лишилася в браузері, застосунку без його панелей так і не побачить.
 */
export const GUIDES: Record<Guide, GuideText> = {
	"ios-safari": {
		title: "pwa.title.iphone",
		note: MANUAL,
		steps: [{ text: "pwa.step.shareBottom", icon: "share" }, ADD_HOME, OPEN_HOME],
	},
	// Chrome буває й на iPad: назва пристрою в заголовку була б неправдою для половини.
	"ios-chrome": {
		title: "pwa.title.app",
		note: MANUAL,
		steps: [
			{ text: "pwa.step.shareAddressBar", icon: "share" },
			{ text: "pwa.step.addHomeChrome", icon: "add" },
			OPEN_HOME,
		],
		warning: "pwa.warning.iosChrome",
	},
	"ios-other": {
		title: "pwa.title.app",
		note: MANUAL,
		steps: [{ text: "pwa.step.shareMenu", icon: "share" }, ADD_HOME, OPEN_HOME],
	},
	"ipad-safari": {
		title: "pwa.title.ipad",
		note: MANUAL,
		steps: [{ text: "pwa.step.shareTop", icon: "share" }, ADD_HOME, OPEN_HOME],
	},
	android: {
		title: "pwa.title.android",
		note: MANUAL,
		steps: [
			{ text: "pwa.step.dots", icon: "dots" },
			{ text: "pwa.step.addHomeAndroid", icon: "add" },
			{ text: "pwa.step.openHomeAndroid", icon: "phone" },
		],
	},
	"android-edge": {
		title: "pwa.title.android",
		note: MANUAL,
		steps: [
			{ text: "pwa.step.edgeMenu", icon: "menu" },
			{ text: "pwa.step.edgeAddToPhone", icon: "add" },
			{ text: "pwa.step.openHomeAndroid", icon: "phone" },
		],
	},
	desktop: {
		title: "pwa.title.desktop",
		note: MANUAL,
		steps: [{ text: "pwa.step.installIcon", icon: "install" }, CONFIRM, OPEN_APP],
	},
	edge: {
		title: "pwa.title.desktop",
		note: MANUAL,
		steps: [{ text: "pwa.step.installIcon", icon: "installEdge" }, CONFIRM, OPEN_APP],
	},
	"mac-safari": {
		title: "pwa.title.mac",
		note: MANUAL,
		steps: [
			{ text: "pwa.step.macFile", icon: "dock" },
			{ text: "pwa.step.macAdd", icon: "add" },
			{ text: "pwa.step.openDock", icon: "app" },
		],
	},
	"firefox-desktop": {
		title: "pwa.title.desktop",
		note: "pwa.note.firefox",
		steps: [
			{ text: "pwa.step.openChromeEdge", icon: "browser" },
			{ text: "pwa.step.installIcon", icon: "install" },
			OPEN_APP,
		],
	},
	// Не встановлення, а дорога до нього: у звичайному браузері людина знову натисне кнопку.
	"in-app": {
		title: "pwa.title.inApp",
		note: "pwa.note.inApp",
		steps: [
			{ text: "pwa.step.inAppMenu", icon: "dots" },
			{ text: "pwa.step.inAppOpen", icon: "browser" },
			{ text: "pwa.step.inAppAgain", icon: "app" },
		],
	},
};
