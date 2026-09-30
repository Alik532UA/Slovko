// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GUIDES, guideFor, isMobileGuide, type Guide } from "./installGuide";

/**
 * ЯКУ ІНСТРУКЦІЮ ВСТАНОВЛЕННЯ ПОКАЗАТИ (канон FULLSCREEN-INSTALL § 5, § 8.1).
 *
 * Рядки браузерів — справжні, а не вигадані: саме на справжніх Slovko помилявся. iPad у
 * Safari звітує `Macintosh`, і людина читала про «іконку встановлення в адресному рядку»,
 * якої в Safari немає; Edge на Android діставав три крапки Chrome, яких там немає.
 *
 * Зворотні експерименти, кожен червоний: iPad без `maxTouchPoints` — «iPad у Safari»; Edge
 * на Android у загальній гілці Android — «Edge на Android»; перевірка Firefox до Android —
 * «Firefox на Android»; месенджер після iPhone — «Instagram»; стара назва пункту Chrome —
 * «назва пункту Chrome»; ключ кроку зник в одній мові — «кожен ключ є в семи мовах».
 */

const UA = {
	iphoneSafari:
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
	iphoneChrome:
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.46 Mobile/15E148 Safari/604.1",
	iphoneFirefox:
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15",
	iphoneEdge:
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/129.0.2792.84 Version/18.0 Mobile/15E148 Safari/604.1",
	/** iPadOS у Safari — «комп'ютерний» рядок, і відрізняє його лише сенсорний екран. */
	macLikeSafari:
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
	ipadChrome:
		"Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.46 Mobile/15E148 Safari/604.1",
	androidChrome:
		"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
	androidFirefox: "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
	androidEdge:
		"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 EdgA/129.0.2792.84",
	samsung:
		"Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
	windowsChrome:
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
	windowsEdge:
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
	macEdge:
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
	macChrome:
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
	windowsFirefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
	macFirefox: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:131.0) Gecko/20100101 Firefox/131.0",
	instagram:
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.25.108 (iPhone15,2; iOS 18_0; uk_UA; uk)",
	facebookAndroid:
		"Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.47.109;]",
	tiktok:
		"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 trill_2023509030 BytedanceWebview/d8a21c6 musical_ly_2023509030",
};

const cases: [string, string, number, Guide][] = [
	["iPhone у Safari", UA.iphoneSafari, 5, "ios-safari"],
	["iPhone у Chrome", UA.iphoneChrome, 5, "ios-chrome"],
	["iPhone у Firefox", UA.iphoneFirefox, 5, "ios-other"],
	["iPhone в Edge", UA.iphoneEdge, 5, "ios-other"],
	["iPad у Safari", UA.macLikeSafari, 5, "ipad-safari"],
	["iPad у Chrome", UA.ipadChrome, 5, "ios-chrome"],
	["Safari на Mac", UA.macLikeSafari, 0, "mac-safari"],
	["Chrome на Android", UA.androidChrome, 5, "android"],
	["Firefox на Android", UA.androidFirefox, 5, "android"],
	["Edge на Android", UA.androidEdge, 5, "android-edge"],
	["Samsung Internet", UA.samsung, 5, "android"],
	["Chrome на Windows", UA.windowsChrome, 0, "desktop"],
	["Edge на Windows", UA.windowsEdge, 0, "edge"],
	["Edge на Mac", UA.macEdge, 0, "edge"],
	["Chrome на Mac", UA.macChrome, 0, "desktop"],
	["Firefox на Windows", UA.windowsFirefox, 0, "firefox-desktop"],
	["Firefox на Mac", UA.macFirefox, 0, "firefox-desktop"],
	["Instagram", UA.instagram, 5, "in-app"],
	["Facebook на Android", UA.facebookAndroid, 5, "in-app"],
	["TikTok", UA.tiktok, 5, "in-app"],
];

describe("яка інструкція", () => {
	for (const [name, ua, touch, expected] of cases) {
		it(`${name} → ${expected}`, () => {
			expect(guideFor(ua, touch)).toBe(expected);
		});
	}

	it("кнопка «для комп'ютера» — лише в інструкціях комп'ютера", () => {
		const desktop = (Object.keys(GUIDES) as Guide[]).filter((guide) => !isMobileGuide(guide));
		expect(desktop.sort()).toEqual(["desktop", "edge", "firefox-desktop", "mac-safari"]);
	});
});

describe("інструкції", () => {
	it("перевірка жива: кожна інструкція має приклад вище", () => {
		const covered = new Set(cases.map(([, , , guide]) => guide));
		expect([...covered].sort()).toEqual(Object.keys(GUIDES).sort());
	});

	it("у кожної — заголовок, вступ і щонайменше три кроки", () => {
		for (const [guide, text] of Object.entries(GUIDES)) {
			expect(text.title, guide).toMatch(/^pwa\.title\./);
			expect(text.note, guide).toMatch(/^pwa\.note\./);
			expect(text.steps.length, guide).toBeGreaterThanOrEqual(3);
		}
	});

	it("останній крок кожної інструкції встановлення — «відкривайте значком»", () => {
		const OPEN = ["pwa.step.openHome", "pwa.step.openHomeAndroid", "pwa.step.openApp", "pwa.step.openDock"];
		for (const [guide, text] of Object.entries(GUIDES)) {
			if (guide === "in-app") continue; // тут не встановлюють, а ведуть у браузер
			expect(OPEN, guide).toContain(text.steps.at(-1)?.text);
		}
	});

	it("Chrome на iPhone — із попередженням про меню «три крапки»", () => {
		expect(GUIDES["ios-chrome"].warning).toBe("pwa.warning.iosChrome");
		const withWarning = Object.entries(GUIDES).filter(([, text]) => text.warning);
		expect(withWarning.map(([guide]) => guide)).toEqual(["ios-chrome"]);
	});

	it("Edge — власний значок встановлення (сітка з плюсом), Chrome — монітор зі стрілкою", () => {
		expect(GUIDES.edge.steps[0].icon).toBe("installEdge");
		expect(GUIDES.desktop.steps[0].icon).toBe("install");
	});

	it("Edge на Android — меню з трьох ліній і «Додати на телефон», а не три крапки Chrome", () => {
		expect(GUIDES["android-edge"].steps.map((step) => [step.text, step.icon])).toEqual([
			["pwa.step.edgeMenu", "menu"],
			["pwa.step.edgeAddToPhone", "add"],
			["pwa.step.openHomeAndroid", "phone"],
		]);
		expect(GUIDES.android.steps[0]).toEqual({ text: "pwa.step.dots", icon: "dots" });
	});

	it("iPad — кнопка «Поділитися» вгорі, а не внизу, як на iPhone", () => {
		expect(GUIDES["ipad-safari"].steps[0].text).toBe("pwa.step.shareTop");
		expect(GUIDES["ios-safari"].steps[0].text).toBe("pwa.step.shareBottom");
	});
});

/* ───────────────────────────── словники ───────────────────────────── */

const LANGUAGES = ["uk", "en", "de", "nl", "pl", "el", "crh"] as const;

const dictionaries = Object.fromEntries(
	LANGUAGES.map((lang) => [
		lang,
		JSON.parse(readFileSync(`src/lib/i18n/translations/${lang}.json`, "utf8")) as Record<string, unknown>,
	]),
);

/** Значення за крапковим ключем, як його бачить `$_()`. */
function lookup(lang: string, key: string): unknown {
	return key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dictionaries[lang]);
}

/** Усі ключі, які читають інструкції, — те, що `InstallGuide` передає в `$_()`. */
const guideKeys = [
	...new Set(
		Object.values(GUIDES).flatMap((text) => [
			text.title,
			text.note,
			...text.steps.map((step) => step.text),
			...(text.warning ? [text.warning] : []),
		]),
	),
].sort();

describe("тексти інструкцій у семи мовах", () => {
	it("кожен ключ є в семи мовах і не порожній", () => {
		// Ключі читає `$_(змінна)`, а не літерал, тож гейт покриття локалізації їх не бачить:
		// відсутній ключ `svelte-i18n` показав би САМИМ ІДЕНТИФІКАТОРОМ.
		const absent = LANGUAGES.flatMap((lang) =>
			guideKeys.filter((key) => {
				const value = lookup(lang, key);
				return typeof value !== "string" || value.trim() === "";
			}).map((key) => `${lang}: ${key}`),
		);
		expect(absent).toEqual([]);
	});

	it("зайвих ключів у гілках інструкцій немає", () => {
		const groups = ["title", "note", "step", "warning"];
		const inDictionary = groups
			.flatMap((group) => Object.keys((lookup("uk", `pwa.${group}`) as Record<string, string>) ?? {}).map((key) => `pwa.${group}.${key}`))
			.sort();
		expect(inDictionary).toEqual(guideKeys);
	});

	/**
	 * Перевірка автора на телефоні 2026-09-29: у Chrome на Android пункт тепер «Установити й
	 * створити ярлик» (Chrome 149–150 перейменовує його поступово — стара назва в дужках).
	 */
	it("назва пункту Chrome на Android — нова, а стара в дужках", () => {
		expect(lookup("uk", "pwa.step.addHomeAndroid")).toMatch(/^Виберіть «Установити й створити ярлик» \(.*«Додати на головний екран»\)$/);
		expect(lookup("en", "pwa.step.addHomeAndroid")).toMatch(/^Select 'Install and create shortcut' \(.*'Add to Home screen'\)$/);
		expect(lookup("uk", "pwa.step.edgeAddToPhone")).toBe("Виберіть «Додати на телефон»");
	});

	it("крок «знову натисніть» бере підпис кнопки параметром у кожній мові", () => {
		const without = LANGUAGES.filter((lang) => !String(lookup(lang, "pwa.step.inAppAgain")).includes("{button}"));
		expect(without).toEqual([]);
	});

	/**
	 * ICU MessageFormat (ним форматує `svelte-i18n`): апостроф перед `{` відкриває
	 * екранування, і `'{button}'` показав би людині «{button}» буквально.
	 */
	it("жоден текст не екранує параметр апострофом", () => {
		const escaped = LANGUAGES.flatMap((lang) =>
			guideKeys.filter((key) => /'\{/.test(String(lookup(lang, key)))).map((key) => `${lang}: ${key}`),
		);
		expect(escaped).toEqual([]);
	});
});
