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

/**
 * Медіазапит УСЕРЕДИНІ компонента (`FS-CONTAINER`, HIGH).
 *
 * Медіазапит міряє вікно, а компонент стоїть у сітці, у бічній панелі або у
 * вікні — і на широкому екрані може мати 240 px. Тобто правильний вигляд
 * виходить рівно в одному розкладі й хибний у всіх інших: саме так той самий
 * компонент і ламається, коли його вперше кладуть в інше місце. Питання «а
 * скільки місця дісталося МЕНІ» ставить `@container`, і в каноні це прямо
 * названо пошуком кандидатів: `grep -rn "@media" src/lib/components/`.
 *
 * Чому число, а не нуль. Переписати запит на контейнерний означає оголосити
 * контейнер на батькові — тобто змінити РОЗКЛАДКУ двох компонентів, і побачити
 * результат можна лише на екрані. Це робота з переглядом, а не заміна рядка,
 * тож нуль тут довелося б купувати правками наосліп. Число не дає боргу
 * рости — і саме тому воно ЛИШЕ СПАДАЄ.
 *
 * Під ратчет підпадають лише запити про РОЗМІР (`min-width`, `max-width`,
 * `min-height`, `max-height`). `prefers-reduced-motion`, `prefers-color-scheme`,
 * `hover`, `pointer` і `display-mode` лишаються медіазапитами законно: вони
 * питають про пристрій і про вибір людини, а не про наявне місце, і
 * контейнерного відповідника не мають. Заміряно на момент запису: 23
 * медіазапити в компонентах, з них 6 — саме такі.
 *
 * `app.css` і маршрути не рахуються: там медіазапит про ВІКНО і є правильним —
 * скільком колонкам поміститися, показувати бічну панель чи ні.
 *
 * Зворотний експеримент виконано: доданий `@media (max-width: 500px)` у
 * `BaseTooltip.svelte` — червоне з новим числом; доданий
 * `@media (prefers-reduced-motion: reduce)` там же — зелене, як і має бути.
 */

/** Стеля, що лише спадає. Кандидат, переписаний на `@container`, опускає її ТИМ САМИМ комітом. */
const KNOWN_SIZE_MEDIA_IN_COMPONENTS = 17;

const COMPONENTS = join(SRC, "lib/components").replace(/\\/g, "/");
const SIZE_QUERY = /(min|max)-(width|height)/;

const sizeMediaInComponents = files
	.filter((f) => f.startsWith(COMPONENTS) && f.endsWith(".svelte"))
	.flatMap((file) => {
		// Лише блок `<style>`: рядок «@media» у коментарі чи в розмітці не стиль.
		const css = /<style[^>]*>([\s\S]*?)<\/style>/.exec(readFileSync(file, "utf8"));
		if (!css) return [];
		return [...css[1].matchAll(/@media[^{]*/g)]
			.map((m) => m[0].replace(/\s+/g, " ").trim())
			.filter((query) => SIZE_QUERY.test(query))
			.map((query) => `${file.replace(`${SRC.replace(/\\/g, "/")}/`, "src/")} — ${query}`);
	});

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

	it(`медіазапитів про розмір у компонентах рівно ${KNOWN_SIZE_MEDIA_IN_COMPONENTS}`, () => {
		// Порожній перелік означав би, що сканер не бачить блоків `<style>`, —
		// і тоді «боргу немає» правдиве за побудовою.
		expect(
			sizeMediaInComponents.length,
			"жодного медіазапиту в компонентах — сканер шукає не там",
		).toBeGreaterThan(0);

		expect(
			sizeMediaInComponents.length,
			"РІВНІСТЬ, а не «не більше»: переписаний на `@container` кандидат мусить " +
				"опустити число ТИМ САМИМ комітом, інакше наступний читач бачить борг, " +
				"якого немає.\nзараз:\n  " + sizeMediaInComponents.join("\n  "),
		).toBe(KNOWN_SIZE_MEDIA_IN_COMPONENTS);
	});
});
