import { localStorageProvider } from "$lib/services/storage/storageProvider";
import { versionStore } from "./VersionStore.svelte";
import { ALL_CHECKS, BETA_TABS } from "$lib/data/beta/checks";
import { COVERAGE_ORDER, type BetaCheck, type Mark, type Vote } from "$lib/data/beta/types";

/**
 * Позначки чеклиста бета-тестування.
 *
 * Відповіді лежать у сховищі браузера, а не в базі (BETA-CHECKLIST-v8 § 6.1):
 * збирати на сервер означає таблицю, правила доступу до неї й чужі імена в ній
 * — заради даних, яких поки ніхто не читає. Рішення дешево скасувати:
 * агрегація доклеюється пізніше, не переписуючи сторінку.
 *
 * Ключ іде через фасад, тож у сховищі він стає `slovko_beta_marks`: цей сайт
 * живе на спільному origin із кількома іншими застосунками, і ключ без
 * префікса перетер би чужі дані (STORAGE-NAMESPACE-v8).
 */
const STORAGE_KEY = "beta_marks";

type MarkMap = Record<string, Mark>;

const VOTES: readonly Vote[] = ["fail", "weird", "ok"];

function isMark(value: unknown): value is Mark {
	if (typeof value !== "object" || value === null) return false;
	const m = value as Record<string, unknown>;
	return VOTES.includes(m.vote as Vote) && typeof m.version === "string";
}

/**
 * Прочитане зі сховища — НЕДОВІРЕНИЙ ВВІД (BETA-CHECKLIST-v9 § 8.6,
 * `BETA-MARKS-UNTRUSTED`).
 *
 * Ключ переживає і зміну чеклиста, і зміну формату позначки, і сусідні
 * застосунки на тому самому origin. Найчастіший випадок безневинний і
 * найгірший: пункт ПРИБРАЛИ зі списку, а позначка лишилася. Форму вона має
 * правильну, тож проходила — і рахувалася в поступі, даючи «47 / 45», число,
 * яке не означає нічого й не має де виправитися: у списку такого пункта вже
 * немає, отже й зняти позначку нема на чому.
 */
function readMarks(): MarkMap {
	const raw = localStorageProvider.getJson<unknown>(STORAGE_KEY);
	if (typeof raw !== "object" || raw === null) return {};

	const known = new Set(ALL_CHECKS.map((check) => check.id));
	const out: MarkMap = {};
	for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
		if (known.has(id) && isMark(value)) out[id] = value;
	}
	return out;
}

class BetaChecklistStore {
	private marks = $state<MarkMap>({});
	private loaded = false;

	/** Читання відкладене до першого звернення: сховища на сервері немає. */
	private ensureLoaded() {
		if (this.loaded) return;
		this.loaded = true;
		this.marks = readMarks();
	}

	load() {
		this.ensureLoaded();
	}

	markOf(id: string): Mark | null {
		return this.marks[id] ?? null;
	}

	voteOf(id: string): Vote | null {
		return this.marks[id]?.vote ?? null;
	}

	/**
	 * Позначка з іншої версії не зникає — вона все ще щось означає, — але
	 * підписується й не рахується в «зроблено на цій» (§ 3.1). Без цього список
	 * поступово стає звітом про минуле, який читають як звіт про теперішнє.
	 */
	isStale(id: string): boolean {
		const mark = this.marks[id];
		return !!mark && mark.version !== versionStore.currentVersion;
	}

	setVote(id: string, vote: Vote) {
		this.ensureLoaded();
		// Повторне натискання того самого стану знімає позначку: інакше
		// помилковий клік неможливо скасувати, і людина лишає неправду.
		if (this.marks[id]?.vote === vote) delete this.marks[id];
		else this.marks[id] = { vote, version: versionStore.currentVersion };
		localStorageProvider.setJson(STORAGE_KEY, this.marks);
	}

	/**
	 * Чи зведена кнопка стирання (§ 6.3, `BETA-CLEAR-TWO-STEP`).
	 *
	 * «Стерти» — ЄДИНА незворотна дія на сторінці, і стоїть вона поруч зі
	 * «Скопіювати звіт», до якого тягнуться щоразу. Ціна помилки несиметрична:
	 * година роботи проти одного зайвого кліка.
	 *
	 * Не `confirm()`: нативний діалог блокує потік, не перекладається, виглядає
	 * чужим у будь-якій темі й у headless вимагає окремого обробника.
	 */
	clearArmed = $state(false);

	/**
	 * Стирання у два кроки: перший виклик лише зводить кнопку, другий стирає.
	 * Повертає `true`, коли позначки справді зникли.
	 */
	requestClear(): boolean {
		if (!this.clearArmed) {
			this.clearArmed = true;
			return false;
		}
		this.clear();
		return true;
	}

	/** Знімає зведення, нічого не стираючи: кнопка не лишається зарядженою. */
	disarmClear() {
		this.clearArmed = false;
	}

	clear() {
		this.marks = {};
		this.clearArmed = false;
		localStorageProvider.removeItem(STORAGE_KEY);
	}

	/**
	 * Поступ ОКРЕМОЇ вкладки (§ 8.1, `BETA-TAB-PROGRESS`).
	 *
	 * Загальне «14 / 45» не відповідає на єдине питання, яке тестувальник собі
	 * ставить: чи закінчена ЦЯ вкладка. Вкладок вісім, проходять їх по одній.
	 */
	progressOf(checks: readonly { id: string }[]): { done: number; total: number } {
		// `ensureLoaded()` тут НЕ кличеться, і це не оптимізація. Метод читає
		// розмітка, тобто виклик стається під час рендера, а `ensureLoaded()` пише
		// в `$state` — Svelte 5 на це кидає `state_unsafe_mutation` і сторінка
		// падає цілком (заміряно: замість чеклиста показувалася панель
		// діагностики збою). Читання робить `load()` з `onMount` сторінки, і на
		// момент першого малювання воно вже зроблене або ще не потрібне.
		const done = checks.filter(
			(check) => this.marks[check.id]?.version === versionStore.currentVersion
		).length;
		return { done, total: checks.length };
	}

	/** Скільки пунктів позначено САМЕ на цій збірці. */
	get doneOnThisVersion(): number {
		return ALL_CHECKS.filter((c) => {
			const mark = this.marks[c.id];
			return !!mark && mark.version === versionStore.currentVersion;
		}).length;
	}

	get total(): number {
		return ALL_CHECKS.length;
	}

	/**
	 * Текст звіту.
	 *
	 * Лише позначені пункти: перелік недивленого робить звіт нечитним.
	 * Поламане — вгорі. Пункт, помічений як зламаний, але оголошений покритим
	 * автотестом, отримує окремий рядок: це звіт про дефект ТЕСТА, і новина
	 * гірша за звичайний баг, бо знецінює всі зелені прогони (§ 3).
	 */
	buildReport(now: string, lang: "uk" | "en" = "uk"): string {
		this.ensureLoaded();
		/*
		 * Мова й тема читаються з кореневого елемента, а не зі сховища
		 * налаштувань. Причина не стилістична: `SettingsStore` статично тягне
		 * `SyncService`, тобто весь SDK бази, — і щойно чеклист став досяжним із
		 * маршруту, гейт `check:build` показав SDK у критичному шляху ГОЛОВНОЇ
		 * сторінки. Чеклистові налаштування гри не потрібні; йому потрібні два
		 * рядки, які кореневий layout сам виставляє на `<html>`.
		 */
		const root = typeof document === "undefined" ? null : document.documentElement;
		const head = [
			`Slovko — звіт бета-тестування`,
			`версія: ${versionStore.currentVersion}`,
			`час: ${now}`,
			`браузер: ${typeof navigator === "undefined" ? "—" : navigator.userAgent}`,
			`мова інтерфейсу: ${root?.lang || "—"}`,
			`тема: ${root?.dataset.theme || "—"}`,
			"",
		];

		const order: Vote[] = ["fail", "weird", "ok"];
		const label: Record<Vote, string> = {
			fail: "[НЕ ПРАЦЮЄ]",
			weird: "[ПРАЦЮЄ, АЛЕ ДИВНО]",
			ok: "[ПРАЦЮЄ]",
		};

		const lines: string[] = [];
		for (const vote of order) {
			for (const tab of BETA_TABS) {
				for (const check of tab.checks) {
					const mark = this.marks[check.id];
					if (!mark || mark.vote !== vote) continue;
					lines.push(`${label[vote]} ${check.id} (${tab.title.uk})`);
					lines.push(`    ${check.text[lang]}`);
					if (mark.version !== versionStore.currentVersion) {
						lines.push(`    (позначено на версії ${mark.version})`);
					}
					if (vote !== "ok" && check.coverage === "covered") {
						lines.push(`    !!! ПУНКТ ПОКРИТО АВТОТЕСТОМ ${check.test} —`);
						lines.push(`        тест не побачив цієї помилки`);
					}
					lines.push("");
				}
			}
		}

		if (lines.length === 0) lines.push("(жодного пункта не позначено)");
		return [...head, ...lines].join("\n");
	}
}

export const betaChecklistStore = new BetaChecklistStore();

/**
 * Пункти вкладки, згруповані рівнем покриття, у порядку `manual → testable →
 * covered` і зі ЗБЕРЕЖЕНИМ порядком оголошення всередині рівня: він
 * тематичний, і сортування за іншим ключем розсипало б розділи.
 */
export function groupByCoverage(checks: readonly BetaCheck[]) {
	return COVERAGE_ORDER.map((coverage) => ({
		coverage,
		checks: checks.filter((c) => c.coverage === coverage),
	})).filter((group) => group.checks.length > 0);
}
