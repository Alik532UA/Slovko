// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Розмір файлу (PROJECT-STRUCTURE § 7, `PS-SIZE-RATCHET`, MEDIUM).
 *
 * Правило MEDIUM, і межа в ньому названа орієнтовною — але його відсутність у
 * v7 дала файли, які вже неможливо тримати в голові. Канон допускає
 * перевищення за однієї умови: воно ЗАПИСАНЕ з причиною.
 *
 * Гейт свідомо не вимагає нуля. Механічне різання файлу навпіл задовольнило б
 * регекс, не додавши нічого: канон просить ділити ЗА ВІДПОВІДАЛЬНІСТЮ, а це
 * робота з перевірками, а не з ножицями.
 *
 * ## Чому перелік зі стелею на кожен файл, а не одне число
 *
 * Доти тут стояло `KNOWN_OVERSIZE = 24` — кількість перевищень. Воно ловило
 * появу НОВОГО завеликого файлу й не заважало жодному з наявних рости скільки
 * завгодно: `SyncService` міг подвоїтися, і прогін лишався зеленим, бо файлів
 * усе ще двадцять чотири. Тобто число стерегло периметр і не стерегло нічого
 * всередині нього. Борг був названий у `PROJECT-CONTEXT.md` як «стеля на
 * кількість замість стелі на файл» — це його закриття.
 *
 * Перелік нижче тримає три речі одразу, і кожна ловить свій вид дрейфу:
 *
 * 1. **Новий файл понад орієнтир** — його немає в переліку, прогін червоніє.
 *    Додати рядок можна лише свідомо.
 * 2. **Зростання вже записаного** — SLOC понад ЙОГО стелю, прогін червоніє.
 *    Стеля дорівнює заміряному на момент запису, тож запас нульовий.
 * 3. **Застаріння самого переліку** — файл, який уже вклався в орієнтир, мусить
 *    бути ВИЛУЧЕНИЙ. Інакше наступний читач бачить борг, якого немає; так уже
 *    сталося з числом у прозі (записано 25 при 24 реальних).
 *
 * Числа в прозі немає навмисно (`PIT-NUMBER-UNDER-GATE`): джерело одне — цей
 * перелік, і прогін друкує кожен файл понад орієнтир.
 */

const SRC = join(process.cwd(), "src");

/** Орієнтири з § 7. Порядок важливий: перше збіжне правило й виграє. */
const LIMITS: { match: RegExp; limit: number; kind: string }[] = [
	{ match: /\/routes\/\+page\.svelte$/, limit: 400, kind: "+page.svelte" },
	{ match: /\.svelte$/, limit: 300, kind: ".svelte" },
	{ match: /\.svelte\.ts$/, limit: 300, kind: ".svelte.ts" },
	{ match: /\.ts$/, limit: 250, kind: ".ts" },
];

/**
 * Стеля на КОЖЕН файл, у SLOC — чистих рядках коду без коментарів.
 *
 * Значення дорівнює заміряному на момент запису. Тобто дописати коментар можна
 * (він не рахується), а дописати код — ні: будь-який доданий рядок робить
 * прогін червоним і вимагає або винести частину, або свідомо підняти число.
 *
 * Перелік лише СКОРОЧУЄТЬСЯ. Файл, розділений за відповідальністю, вилучається
 * звідси ТИМ САМИМ комітом.
 */
const OVERSIZE_CEILINGS: Record<string, number> = {
	"src/lib/services/firebase/SyncService.svelte.ts": 651,
	"src/lib/components/onboarding/OnboardingModal.svelte": 647,
	"src/lib/components/navigation/PlaylistModal.svelte": 613,
	"src/lib/services/firebase/FriendsService.ts": 606,
	"src/routes/+layout.svelte": 548,
	"src/lib/components/settings/LanguageSettings.svelte": 508,
	"src/lib/components/navigation/modes/PlaylistGrid.svelte": 482,
	"src/lib/controllers/PlaylistStore.svelte.ts": 457,
	"src/lib/components/profile/Leaderboard.svelte": 452,
	// 450 → 451: сталому підкресленню посилання потрібен один рядок CSS,
	// і запас тут нульовий за побудовою. Плата за наступний — розділити файл.
	"src/lib/components/auth/AuthForm.svelte": 451,
	"src/lib/components/profile/ProfileStats.svelte": 409,
	"src/lib/components/game/GameStats.svelte": 399,
	"src/lib/components/profile/AvatarEditor.svelte": 374,
	"src/lib/components/settings/AboutModal.svelte": 370,
	"src/lib/controllers/ProgressStore.svelte.ts": 361,
	"src/lib/components/friends/UserSearch.svelte": 355,
	"src/lib/components/settings/FeedbackModal.svelte": 337,
	"src/lib/components/settings/VoiceSelectionModal.svelte": 327,
	"src/lib/services/gameDataService.ts": 325,
	"src/lib/components/game/WordCard.svelte": 314,
	"src/lib/components/interaction/InteractionCapsule.svelte": 314,
	"src/lib/services/firebase/PresenceService.svelte.ts": 314,
	"src/lib/components/game/swipe/SwipeCard.svelte": 305,
	"src/lib/components/navigation/MenuModal.svelte": 303,
};

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.(ts|svelte)$/.test(entry)) out.push(full.replace(/\\/g, "/"));
	}
	return out;
}

const countSloc = (file: string): number => {
	const text = readFileSync(file, "utf8");
	return text
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/^\s*\/\/.*$/gm, "")
		.split(/\r?\n/)
		.filter((l) => l.trim().length > 0).length;
};

const files = walk(SRC)
	.filter((f) => !/\.(test|spec)\.ts$/.test(f))
	// Словники й набори слів — дані, а не код: ділити їх за відповідальністю
	// нема на що, а розмір там визначає предметна область.
	.filter((f) => !/\/lib\/data\//.test(f));

const relative = (file: string) =>
	file.replace(`${SRC.replace(/\\/g, "/")}/`, "src/");

/** Кожен файл, що перевищує ОРІЄНТИР свого типу, разом із заміряним SLOC. */
const oversize = new Map<string, { lines: number; limit: number }>();
for (const file of files) {
	const rule = LIMITS.find((r) =>
		r.kind === ".svelte.ts" ? file.endsWith(".svelte.ts") : r.match.test(file),
	);
	if (!rule) continue;
	const lines = countSloc(file);
	if (lines > rule.limit)
		oversize.set(relative(file), { lines, limit: rule.limit });
}

describe("розмір файлу (PS-SIZE-RATCHET, MEDIUM)", () => {
	it("перевірка жива: джерела знайдено, орієнтири застосовані", () => {
		expect(files.length).toBeGreaterThan(50);
		// Нуль перевищень при непорожньому переліку означав би, що фільтр з'їв
		// усе, а не що проєкт раптово порізали.
		expect(oversize.size).toBeGreaterThan(0);
		expect(Object.keys(OVERSIZE_CEILINGS).length).toBeGreaterThan(0);
	});

	it("кожне перевищення записане в переліку", () => {
		const unlisted = [...oversize.entries()]
			.filter(([file]) => !(file in OVERSIZE_CEILINGS))
			.map(
				([file, { lines, limit }]) =>
					`${file}: ${lines} SLOC (орієнтир ${limit})`,
			)
			.sort();

		expect(
			unlisted,
			"файл понад орієнтир, якого немає в OVERSIZE_CEILINGS. Канон допускає " +
				"перевищення рівно за умови, що воно ЗАПИСАНЕ — або винести частину, " +
				`або дописати рядок зі стелею свідомо:\n  ${unlisted.join("\n  ")}`,
		).toEqual([]);
	});

	it("жоден записаний файл не переріс власну стелю", () => {
		const grown = [...oversize.entries()]
			.filter(
				([file, { lines }]) =>
					file in OVERSIZE_CEILINGS && lines > OVERSIZE_CEILINGS[file],
			)
			.map(
				([file, { lines }]) =>
					`${file}: ${lines} SLOC при стелі ${OVERSIZE_CEILINGS[file]}`,
			)
			.sort();

		expect(
			grown,
			"саме цього не ловило число «скільки файлів понад орієнтир»: файл, уже " +
				"записаний як завеликий, міг рости скільки завгодно, і кількість не " +
				`змінювалася:\n  ${grown.join("\n  ")}`,
		).toEqual([]);
	});

	it("у переліку немає файлів, які вже вклалися в орієнтир", () => {
		const stale = Object.keys(OVERSIZE_CEILINGS)
			.filter((file) => !oversize.has(file))
			.sort();

		expect(
			stale,
			"файл більше не перевищує орієнтир (або переїхав, або зник) — рядок " +
				"вилучається ТИМ САМИМ комітом. Інакше наступний читач бачить борг, " +
				`якого немає:\n  ${stale.join("\n  ")}`,
		).toEqual([]);
	});
});
