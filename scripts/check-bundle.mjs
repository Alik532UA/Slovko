#!/usr/bin/env node
/**
 * Бюджет бандла (PERFORMANCE-v8 § 10.1). Запуск: після `npm run build`.
 *
 * **Що саме міряється — і чому не те, що в каноні.** Шаблон канону складає
 * `build/_app/immutable/entry`. У цьому проєкті там 2 КБ: Vite ділить збірку по
 * маршрутах, і в `entry` лежить лише завантажувач. Бюджет над цією текою був би
 * зеленим завжди й не значив би нічого — рівно те, від чого канон застерігає в
 * тому ж § 10.1 («якщо шлях зміниться, перевірка має ВПАСТИ, а не мовчки
 * знайти нуль файлів»).
 *
 * Тому міряється КРИТИЧНИЙ ШЛЯХ: усе, що `build/index.html` просить
 * передзавантажити. Це те, що справді доїжджає до браузера, перш ніж людина
 * побачить першу картку, і те, що зростає непомітно — від одного статичного
 * імпорту в кореневому шарі. Той самий перелік уже читає `check-build.mjs` для
 * перевірки, що SDK бази поза критичним шляхом.
 *
 * **Стеля — заміряне число, а не побажання.** Канон радить 150 КБ; тут 214, і
 * поставити 150 означало б завести гейт, який доводиться вимикати — те саме, що
 * пакет забороняє в CODE-QUALITY § 6.4.1 про `off`. Тому стеля стоїть трохи
 * вище заміряного і може лише ЗНИЖУВАТИСЯ, як поріг axe (A11Y-AXE-BASELINE).
 * Орієнтир 150 названий тут, щоб не забувався.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): знизити `LIMIT_KB` до
 * поточного розміру мінус один — скрипт мусить упасти й назвати обидва числа.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUILD = 'build';
const ENTRY = join(BUILD, 'index.html');

/** Стеля критичного шляху, КБ gzip. Заміряно 2026-08-20: 214. Орієнтир канону — 150. */
const LIMIT_KB = 240;

if (!existsSync(ENTRY)) {
	console.error(`${ENTRY} немає — спершу \`npm run build\`.`);
	process.exit(1);
}

const html = readFileSync(ENTRY, 'utf8');
const preloaded = [
	...new Set([...html.matchAll(/immutable\/(?:chunks|entry|nodes)\/[\w.-]+\.js/g)].map((m) => m[0]))
];

// Канарка: нуль файлів означає, що структура `build/` змінилася, а не що бандл
// схуднув до нічого. Без цього рядка перевірка ставала б зеленою саме тоді,
// коли перестала працювати.
if (preloaded.length === 0) {
	console.error(
		'index.html: жодного modulepreload — міряти нічого. Структура build/ змінилася?'
	);
	process.exit(1);
}

let bytes = 0;
const missing = [];
for (const rel of preloaded) {
	const file = join(BUILD, '_app', rel);
	if (!existsSync(file)) {
		missing.push(rel);
		continue;
	}
	bytes += gzipSync(readFileSync(file)).length;
}

// Передзавантажений файл, якого немає на диску, — це 404 у критичному шляху.
if (missing.length > 0) {
	console.error(`index.html просить файли, яких у build/ немає:\n  • ${missing.join('\n  • ')}`);
	process.exit(1);
}

const kb = Math.round(bytes / 1024);
console.log(`Критичний шлях: ${kb} КБ gzip у ${preloaded.length} файлах (стеля ${LIMIT_KB}).`);

if (kb > LIMIT_KB) {
	console.error(
		`Бюджет перевищено: ${kb} КБ проти ${LIMIT_KB}. Стеля може лише знижуватися — ` +
			'підіймати її замість того, щоб розібратися, означає скасувати сам бюджет.'
	);
	process.exit(1);
}
