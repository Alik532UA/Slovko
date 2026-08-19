#!/usr/bin/env node
/**
 * Інваріанти над ЗІБРАНИМ виводом (SEO-v8 § 6.1, гейт GATE-BUILD-OUTPUT).
 *
 * Це єдиний гейт, який бачить клас дефектів, невидимий у `src/`
 * (AI-AGENT-PITFALLS-v8 § 2). Пререндер виконується в іншому середовищі, ніж
 * передбачає читання коду: інший origin, інший `base`, послідовний рендер в
 * одному процесі. Через це в `build/*.html` уже знаходили `sveltekit-prerender`
 * в адресах, canonical із зайвою крапкою й порожнє тіло сторінки — і жодного з
 * них не було видно в джерелах.
 *
 * Запуск: `npm run check:build` (після `npm run build`).
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): прибрати `<link
 * rel="canonical">` з `app.html` і перезібрати — перевірка мусить упасти саме
 * на ньому й назвати файл.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BUILD = 'build';
const ORIGIN = 'https://alik532ua.github.io';
const BASE = process.env.BASE_PATH ?? '/Slovko';

/**
 * Маршрути, яких не мусить бути в пошуку (BETA-CHECKLIST-v8 § 4).
 *
 * Перелік дублюється з `src/lib/config/hiddenRoutes.ts` навмисно: цей скрипт —
 * звичайний Node без збірки, і `$lib` йому не резолвиться. Розбіжність двох
 * копій ловить `src/beta-checklist.test.ts`, який читає обидва файли.
 */
const HIDDEN_ROUTES = ['beta-test-checklists'];
const isHidden = (where) => HIDDEN_ROUTES.some((r) => where.includes(`/${r}/`));

const failures = [];
const fail = (message) => failures.push(message);

function walk(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else out.push(full);
	}
	return out;
}

if (!existsSync(BUILD)) {
	console.error(`Теки ${BUILD}/ немає — спершу \`npm run build\`.`);
	process.exit(1);
}

const files = walk(BUILD);
const pages = files.filter((f) => f.endsWith('.html'));

// Канарка: без неї порожня чи перейменована тека дала б зелений результат.
if (pages.length === 0) fail('у build/ немає жодної сторінки — перевіряти нема що');

for (const page of pages) {
	const html = readFileSync(page, 'utf8');
	const where = page.replace(/\\/g, '/');

	// 1. Адреси пререндера. Знак того, що під час збірки взяли `page.url.origin`,
	//    а він у пререндері фальшивий.
	if (html.includes('sveltekit-prerender')) {
		fail(`${where}: в адресах лишився sveltekit-prerender`);
	}

	// 2. Мова сторінки. Порожній або відсутній lang — і читалка озвучує все
	//    голосом мови за замовчуванням системи.
	const lang = /<html[^>]*\blang="([^"]*)"/.exec(html)?.[1];
	if (!lang) fail(`${where}: у <html> немає атрибута lang`);

	// 3. Заголовок і опис. Тут SSR вимкнено (`+page.ts`), тож зі `svelte:head`
	//    у розмітку не потрапляє НІЧОГО — обидва теги живуть статично в
	//    app.html, і зникнути можуть непомітно. Одного разу вже зникали.
	const title = /<title>([^<]*)<\/title>/.exec(html)?.[1]?.trim();
	if (!title || title.length < 5) fail(`${where}: порожній або надто короткий <title>`);

	const description = /<meta\s+name="description"\s+content="([^"]*)"/.exec(html)?.[1];
	if (!description || description.length < 50) {
		fail(`${where}: опис відсутній або коротший за 50 символів`);
	}

	// 4. Canonical — абсолютний і з базовим шляхом. Відносний або без бази веде
	//    пошуковик на адресу, якої на хостингу немає.
	const canonical = /<link\s+rel="canonical"\s+href="([^"]*)"/.exec(html)?.[1];
	if (isHidden(where)) {
		/*
		 * Прихована сторінка перевіряється ПРОТИЛЕЖНО (BETA-CHECKLIST-v8 § 5.5):
		 * `noindex` мусить БУТИ, `canonical` — НЕ мусить. Разом вони дають
		 * протилежні сигнали: «не індексуй» і «оце канонічна адреса для
		 * індексу». Прирівняти таку сторінку до 404-фолбека (аби просто не
		 * вимагати canonical) — дешевше на два рядки й неправильно: разом із
		 * canonical вона перестала б перевірятися на порожнє тіло й на <title>,
		 * і найслабше покритою стала б саме та сторінка, якою користуються
		 * тестувальники.
		 */
		if (canonical) fail(`${where}: у прихованої сторінки не мусить бути canonical`);
		if (!/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) {
			fail(`${where}: прихована сторінка без noindex — вона потрапить у пошук`);
		}
	} else if (!canonical) fail(`${where}: немає <link rel="canonical">`);
	else if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) {
		fail(`${where}: звичайна сторінка з noindex — вона зникне з пошуку`);
	} else if (!canonical.startsWith(`${ORIGIN}${BASE}`)) {
		fail(`${where}: canonical «${canonical}» не починається з ${ORIGIN}${BASE}`);
	} else if (/\.\/|\/\/$|\.\//.test(canonical.slice(ORIGIN.length))) {
		fail(`${where}: canonical «${canonical}» містить відносний фрагмент`);
	}

	// 5. CSP і хеші інлайн-скриптів. На статиці політика приїжджає мета-тегом і
	//    діє лише на те, що НИЖЧЕ за неї; скрипт без свого хеша блокується
	//    МОВЧКИ — сторінка малюється, просто щось перестає працювати
	//    (SECURITY-v8 § 6.2, § 6.3).
	const cspTag = /<meta\s+http-equiv="content-security-policy"\s+content="([^"]*)"/i.exec(html);
	if (!cspTag) {
		fail(`${where}: у зібраному HTML немає політики безпеки`);
	} else {
		const policy = cspTag.group ?? cspTag[1];
		const policyAt = cspTag.index;
		const hashes = new Set(policy.match(/'sha256-[A-Za-z0-9+/=]+'/g) ?? []);

		for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/g)) {
			const bodyStart = m.index + m[0].length;
			const bodyEnd = html.indexOf('</script>', bodyStart);
			const body = html.slice(bodyStart, bodyEnd);
			const digest = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
			const head = body.trim().split('\n')[0].slice(0, 40);

			if (m.index < policyAt) {
				fail(`${where}: інлайн-скрипт вище політики («${head}…») — вона його не покриває`);
			}
			if (!hashes.has(digest)) {
				fail(`${where}: інлайн-скрипт («${head}…») не має хеша в script-src — буде заблокований`);
			}
		}
	}
}

// 6. Секрети в бандлі (SECURITY-v8 § 16). Клієнтський код публічний цілком.
const SECRET = /(API_SECRET|PRIVATE_KEY|SERVICE_ACCOUNT|BEGIN [A-Z ]*PRIVATE KEY)/;
for (const file of files.filter((f) => /\.(html|js|json|css)$/.test(f))) {
	if (SECRET.test(readFileSync(file, 'utf8'))) {
		fail(`${file.replace(/\\/g, '/')}: схоже на секрет у зібраному виводі`);
	}
}

// 7. Файли, на які посилаються robots і маніфест, справді лежать поруч.
for (const asset of ['sitemap.xml', 'robots.txt', 'manifest.json', 'service-worker.js']) {
	if (!existsSync(join(BUILD, asset))) fail(`build/${asset}: файлу немає`);
}

/*
 * 8. SDK бази — не в критичному шляху (CLOUD-DATABASE-v8 § 10.2).
 *
 * ЧОМУ ПО `build/`, А НЕ ПО КОДУ. `services/firebase/config.ts` імпортує SDK
 * статично, і формально це відхилення від § 10.2, який просить `await import()`.
 * Але сам § 10.2 називає справжню перевірку: «чанк із SDK не має бути в
 * `modulepreload` початкової сторінки». Vite ділить збірку по маршрутах, і
 * пакет лягає в окремий чанк тих екранів, які до бази справді звертаються.
 *
 * Заміряно 2026-08-18: один чанк 380 КБ, у передзавантаженні початкової
 * сторінки — нуль. Тобто мета правила виконана, а форма — ні; ця перевірка й
 * робить різницю між «виконана» і «схоже, що виконана». Щойно якийсь сервіс із
 * SDK доїде до кореневого шару, гейт впаде — і тоді ліниві імпорти стануть
 * обовʼязковими, а не косметичними.
 */
{
	const entryPath = join(BUILD, 'index.html');
	const entryHtml = existsSync(entryPath) ? readFileSync(entryPath, 'utf8') : '';
	const preloaded = new Set(
		[...entryHtml.matchAll(/immutable\/(?:chunks|entry|nodes)\/[\w.-]+\.js/g)].map((m) => m[0])
	);
	// Канарка: якщо передзавантажених файлів немає взагалі, перевірка нічого не
	// доводить — їй просто не було на що дивитися (AI-AGENT-PITFALLS-v8 § 1).
	if (preloaded.size === 0) {
		fail('index.html: немає жодного modulepreload — перевірку SDK нічим виконати');
	} else {
		let found = 0;
		for (const rel of preloaded) {
			const file = join(BUILD, '_app', rel);
			if (existsSync(file) && readFileSync(file, 'utf8').includes('FirebaseError')) {
				fail(`SDK бази в критичному шляху: ${rel}`);
				found++;
			}
		}
		if (found === 0) {
			console.log(
				`check-build: SDK бази поза критичним шляхом (${preloaded.size} передзавантажених файлів)`
			);
		}
	}
}

/*
 * Прихована сторінка мусить ІСНУВАТИ. Зниклий маршрут виглядає точно так само,
 * як правильно прихований: у пошуку його немає ні там, ні там, — і тестувальник
 * дізнається про це, відкривши надіслане посилання й побачивши 404.
 */
for (const route of HIDDEN_ROUTES) {
	if (!existsSync(join(BUILD, route, 'index.html'))) {
		fail(`build/${route}/index.html: прихованої сторінки немає в збірці`);
	}
	const sitemap = existsSync(join(BUILD, 'sitemap.xml'))
		? readFileSync(join(BUILD, 'sitemap.xml'), 'utf8')
		: '';
	if (sitemap.includes(route)) fail(`sitemap.xml: службова сторінка ${route} потрапила в мапу`);

	const robots = existsSync(join(BUILD, 'robots.txt'))
		? readFileSync(join(BUILD, 'robots.txt'), 'utf8')
		: '';
	if (!robots.includes(`Disallow: ${BASE}/${route}/`)) {
		fail(`robots.txt: немає Disallow для ${route}`);
	}
}

if (failures.length > 0) {
	console.error(`Перевірка зібраного виводу знайшла ${failures.length} проблем:`);
	for (const message of failures) console.error(`  • ${message}`);
	process.exit(1);
}

console.log(`Зібраний вивід у нормі: ${pages.length} сторінок, ${files.length} файлів.`);
