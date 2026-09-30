// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

/**
 * ПОДІЮ «МОЖНА ВСТАНОВИТИ» ЛОВИТЬ ПЕРШИЙ КАДР — і лише він
 * (канон FULLSCREEN-INSTALL § 3.2, § 8.1).
 *
 * Доти слухачів `beforeinstallprompt` і `appinstalled` вішав `PwaStore`, і двічі: з
 * конструктора й ще раз викликом `pwaStore.init()` з кореневого макета. Журнал писав подію
 * двічі, а прибрати зайвого слухача не було чим. Тепер подію ловить інлайн-скрипт
 * `app.html`: він стоїть до бандла, тож подія, що приходить РАЗ і рано, не загубиться ні в
 * dev, ні в збірці. Натиск читає сховок через `services/pwa/installPrompt.ts`.
 *
 * Скрипт тут ВИКОНУЄТЬСЯ на підставному `window`, а не звіряється текстом: помилку в
 * ньому не бачать ні `svelte-check`, ні ESLint — це чистий HTML.
 *
 * Зворотні експерименти, кожен червоний: прибрати `preventDefault` — «глушить»; не
 * очищати сховок на `appinstalled` — «встановили»; повернути слухача в `PwaStore` —
 * «слухач один»; повернути `pwaStore.init()` у макет — «init один».
 */

const html = readFileSync("src/app.html", "utf8");

/** Тіла інлайн-скриптів `app.html` — рівно те, що виконає браузер. */
const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const installScripts = inlineScripts.filter((body) => body.includes("beforeinstallprompt"));
const installScript = installScripts[0] ?? "";

/** Прогнати скрипт на підставному `window`. */
function runInstallScript(window: Record<string, unknown> = {}) {
	const listeners = new Map<string, (event: unknown) => void>();
	window.addEventListener ??= (type: string, listener: (event: unknown) => void) =>
		listeners.set(type, listener);
	// Окремий контекст, а не `new Function`: скрипт бачить рівно ці імена — як браузер на
	// першому кадрі, коли застосунку ще немає.
	runInNewContext(installScript, { window });
	return { window, fire: (type: string, event: unknown = {}) => listeners.get(type)?.(event) };
}

describe("подія «можна встановити» — на першому кадрі", () => {
	it("перевірка жива: скрипт знайдено, і він один", () => {
		expect(installScripts).toHaveLength(1);
		expect(installScript).toContain("appinstalled");
	});

	it("стоїть нижче %sveltekit.head%: мета-політика CSP покриває лише те, що після неї", () => {
		expect(html.indexOf(installScript)).toBeGreaterThan(html.indexOf("%sveltekit.head%"));
	});

	it("ловить, глушить смужку браузера й зберігає для натиску", () => {
		const frame = runInstallScript();
		const event = { preventDefault: vi.fn() };
		frame.fire("beforeinstallprompt", event);
		expect(event.preventDefault).toHaveBeenCalledTimes(1);
		expect(frame.window.__pwaInstallPrompt).toBe(event);
	});

	it("встановили — подію забуто: вдруге вікна браузера не буде", () => {
		const frame = runInstallScript();
		frame.fire("beforeinstallprompt", { preventDefault: () => {} });
		frame.fire("appinstalled");
		expect(frame.window.__pwaInstallPrompt).toBeNull();
	});

	it("браузер без addEventListener — скрипт не падає й не зупиняє сторінку", () => {
		expect(() => runInNewContext(installScript, { window: {} })).not.toThrow();
	});

	it("той самий сховок читає модуль встановлення", () => {
		const module = readFileSync("src/lib/services/pwa/installPrompt.ts", "utf8");
		expect(installScript).toContain("window.__pwaInstallPrompt = event");
		expect(module).toContain("__pwaInstallPrompt");
	});
});

/* ─────────────────────── слухач один, init один ─────────────────────── */

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.(ts|js|svelte)$/.test(entry) && !/\.(test|spec)\.(ts|js)$/.test(entry))
			out.push(full.replace(/\\/g, "/"));
	}
	return out;
}

/** Без коментарів: пояснення «чому слухача тут більше немає» не мусить червонити гейт. */
const code = (file: string) =>
	readFileSync(file, "utf8")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

describe("шлях події один", () => {
	const sources = walk("src");

	it("перевірка жива: джерела знайдено", () => {
		expect(sources.length).toBeGreaterThan(50);
	});

	it("слухач beforeinstallprompt один — у app.html", () => {
		const second = sources.filter((file) => /["'`]beforeinstallprompt["'`]/.test(code(file)));
		expect(second, "другий слухач — це подвійний журнал і два шляхи до однієї події").toEqual([]);
	});

	it("другого виклику init немає: єдиного слухача ставить конструктор стору", () => {
		const calls = sources.filter((file) => /pwaStore\.init\s*\(/.test(code(file)));
		expect(calls).toEqual([]);
		expect(code("src/lib/controllers/PwaStore.svelte.ts")).not.toMatch(/\binit\s*\(/);
	});
});
