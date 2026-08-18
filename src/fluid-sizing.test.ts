// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Вертикальні розміри від `dvh`, а не від `vh` (FLUID-SIZING-v8 § 2).
 *
 * `vh` на мобільних не враховує згортання панелі браузера: 100vh — це висота
 * вікна з РОЗГОРНУТОЮ панеллю, тож нижній край лишається під нею. Видно це
 * лише на справжньому телефоні; на будь-якому десктопному вікні різниці немає
 * взагалі, і саме тому правило не ловиться оком.
 *
 * Що це коштувало тут: `max-height: 80vh` на вікні плейлістів і `50vh` на
 * виборі голосу — тобто кнопки внизу обох вікон; `100vh` на екрані міграції,
 * помилки й завантаження; `5vh` відступу в `BaseModal`, тобто в КОЖНОМУ вікні
 * застосунку; три `clamp(…, Nvh, …)` на розмірі шрифту картки слова.
 *
 * Виняток один і він названий: пара в `app.css`, де `calc(var(--vh) * 100)`
 * стоїть ПЕРЕД `100dvh` як запасний варіант для браузерів без `dvh`. Це не
 * борг, а прогресивне покращення: рядок нижче перекриває рядок вище там, де
 * одиниця підтримується.
 */

const SRC = join(process.cwd(), "src");

/**
 * Дозволена форма: `--vh` як власна змінна із запасним `1vh` усередині
 * `calc()`. Значення їй виставляє `+layout.svelte` на `resize`.
 */
const FALLBACK_FORM = /calc\(var\(--vh,\s*1vh\)\s*\*\s*100\)/;

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.(svelte|css)$/.test(entry)) out.push(full.replace(/\\/g, "/"));
	}
	return out;
}

const files = walk(SRC);

const offenders = files.flatMap((file) =>
	readFileSync(file, "utf8")
		.split("\n")
		.map((line, i) => ({ line, at: i + 1 }))
		// Спершу прибираємо дозволену форму, і лише потім шукаємо `vh`:
		// інакше запасний варіант у `app.css` сам себе й ловив би.
		.filter(({ line }) => /[\d.]vh\b/.test(line.replace(FALLBACK_FORM, "")))
		.map(({ at }) => `${file.replace(`${SRC.replace(/\\/g, "/")}/`, "src/")}:${at}`),
);

describe("масштабування від екрана (FLUID-SIZING-v8 § 2)", () => {
	it("перевірка жива: стилі знайдено, і `dvh` у проєкті вживається", () => {
		expect(files.length).toBeGreaterThan(20);
		const withDvh = files.filter((f) => /dvh\b/.test(readFileSync(f, "utf8")));
		expect(withDvh.length).toBeGreaterThan(0);
	});

	it("запасний варіант `--vh` лишився на місці", () => {
		// Прибрати його «щоб перевірка стала зеленою» — означало б забрати
		// підтримку браузерів без `dvh`, а не полагодити правило.
		const appCss = readFileSync(join(SRC, "app.css"), "utf8");
		expect(FALLBACK_FORM.test(appCss)).toBe(true);
	});

	it("вертикальні розміри беруться з `dvh`, а не з `vh`", () => {
		expect(
			offenders,
			`vh замість dvh — нижній край лишиться під панеллю браузера:\n${offenders.join("\n")}`,
		).toEqual([]);
	});
});
