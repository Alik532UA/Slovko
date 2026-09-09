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
import { createHash } from "node:crypto";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { checkGeo } from "./check-geo.mjs";

const BUILD = "build";
const ORIGIN = "https://alik532ua.github.io";
const BASE = process.env.BASE_PATH ?? "/Slovko";

/**
 * Маршрути, яких не мусить бути в пошуку (BETA-CHECKLIST-v8 § 4).
 *
 * Перелік дублюється з `src/lib/config/hiddenRoutes.ts` навмисно: цей скрипт —
 * звичайний Node без збірки, і `$lib` йому не резолвиться. Розбіжність двох
 * копій ловить `src/beta-checklist.test.ts`, який читає обидва файли.
 */
const HIDDEN_ROUTES = ["beta-test-checklists"];
const isHidden = (where) => HIDDEN_ROUTES.some((r) => where.includes(`/${r}/`));

/**
 * Інлайнові обробники подій у зібраному HTML (SECURITY-v8 § 6.3.2,
 * `SEC-CSP-SPREAD-HANDLER`).
 *
 * Політика цього проєкту не має ні `'unsafe-inline'`, ні `'unsafe-hashes'` —
 * тобто браузер відмовляється виконувати БУДЬ-ЯКИЙ атрибут-обробник у
 * розмітці, і хеші тут не рятують у принципі: «hashes do not apply to event
 * handlers».
 *
 * Ловиться саме тут, а не в `src/`, бо в джерелах цих атрибутів немає за
 * визначенням. Їх додає компілятор Svelte 5 на елемент, чиї атрибути задані
 * РОЗГОРТАННЯМ (`<img {...size} />`): що лежить в об'єкті, він не знає, тож
 * вставляє гачок відтворення події `onload="this.__e=event"` про всяк випадок.
 * У сусідньому проєкті тринадцять таких `<img>` дали 15 порушень CSP на
 * головній — при чистому `svelte-check` і зелених юніт-перевірках.
 *
 * Перелік імен, а не `/\bon[a-z]+=/`: друге збігається з `only=` і з кожним
 * майбутнім атрибутом, у якому є «on».
 */
const INLINE_HANDLERS = [
	"onload",
	"onerror",
	"onclick",
	"onchange",
	"oninput",
	"onsubmit",
	"onfocus",
	"onblur",
	"ontoggle",
	"onanimationend",
];
const INLINE_HANDLER_ATTR = new RegExp(
	`\\s(?:${INLINE_HANDLERS.join("|")})\\s*=\\s*["'][^"']*["']`,
	"gi",
);

const failures = [];
const fail = (message) => failures.push(message);

/**
 * Критичні ресурси сторінки: стилі й модулі, які браузер тягне ще до першого
 * кадру. Порядок атрибутів у тезі не фіксований (`rel` буває і до, і після
 * `href`), тому спершу береться тег цілком, і вже з нього — атрибути.
 */
const attrOf = (tag, name) =>
	new RegExp(`${name}="([^"]*)"`, "i").exec(tag)?.[1] ?? "";

function criticalAssets(html) {
	const urls = [];
	let styles = 0;
	let scripts = 0;
	for (const m of html.matchAll(/<link\b([^>]*)>/gi)) {
		const rel = attrOf(m[1], "rel");
		const href = attrOf(m[1], "href");
		if (!href) continue;
		if (rel === "stylesheet") styles++;
		else if (rel === "modulepreload") scripts++;
		else continue;
		urls.push(href);
	}
	for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)) {
		scripts++;
		urls.push(m[1]);
	}
	return { urls, styles, scripts };
}

/** Адреса ресурсу → файл на диску, або null, якщо ресурс зовнішній. */
function resolveAsset(pageFile, url) {
	if (
		/^https?:/i.test(url) ||
		url.startsWith("data:") ||
		url.startsWith("//")
	) {
		return null;
	}
	if (url.startsWith("/")) {
		// Абсолютна адреса несе базовий шлях (`/Slovko/...`), а на диску його
		// немає: `build/` І Є коренем сайту.
		const withoutBase = url.startsWith(`${BASE}/`)
			? url.slice(BASE.length)
			: url;
		return join(BUILD, withoutBase.replace(/^\//, ""));
	}
	return join(dirname(pageFile), url);
}

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
const pages = files.filter((f) => f.endsWith(".html"));

// Канарка: без неї порожня чи перейменована тека дала б зелений результат.
if (pages.length === 0)
	fail("у build/ немає жодної сторінки — перевіряти нема що");

/**
 * Маршрути, які вимикають SSR, — виведені з ДЖЕРЕЛ, а не перелічені руками.
 *
 * Навіщо. `ssr = false` означає, що в пререндер не потрапляє нічого з тіла
 * сторінки: у `build/…/index.html` лежить порожній `<body>` і бутстрап-скрипт.
 * Пошуковик індексує саме це — SEO-v8 називає порожнє тіло в пререндері
 * CRITICAL. Перевірки на нього тут не було ЗОВСІМ, тобто найдорожчий дефект
 * файлу був єдиним, якого гейт не бачив.
 *
 * Чому не просто «заборонити порожнє тіло». Ігровий маршрут вимикає SSR
 * свідомо: гра будується зі сховища браузера. Виправлення — це рішення про
 * архітектуру сторінки, а не правка гейта, і його не можна прийняти мовчки.
 * Тому гейт робить інше й корисніше: тримає ВІДПОВІДНІСТЬ між тим, які
 * сторінки їдуть порожніми, і тим, які маршрути це оголосили.
 *
 * Обидва напрямки важливі:
 *   • порожня сторінка БЕЗ `ssr = false` — новий дефект, і його видно одразу;
 *   • сторінка з `ssr = false`, яка приїхала з повним тілом, — знак, що прапорець
 *     уже не потрібен, і перелік винятків може СКОРОТИТИСЯ.
 *
 * Друге не менш цінне за перше: доти виняток був невидимий, тож і скорочуватися
 * йому було нікуди.
 */
const ROUTES = "src/routes";
const BODY_TEXT_MIN = 200;

function routesWithoutSsr(dir = ROUTES, prefix = "") {
	const found = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			found.push(...routesWithoutSsr(full, `${prefix}${entry}/`));
		} else if (/^\+page\.(ts|js)$/.test(entry)) {
			const source = readFileSync(full, "utf8").replace(
				/\/\*[\s\S]*?\*\//g,
				"",
			);
			if (/export\s+const\s+ssr\s*=\s*false/.test(source)) found.push(prefix);
		}
	}
	return found;
}

const noSsrRoutes = routesWithoutSsr();
if (noSsrRoutes.length === 0 && !existsSync(join(ROUTES, "+page.svelte"))) {
	fail("маршрутів не знайдено — перевірка порожнього тіла шукає не там");
}

/** `404.html` — SPA-фолбек адаптера, а не сторінка: тіла в нього не буває за призначенням. */
const isFallback = (where) => where.endsWith("/404.html");

/** Сторінка належить маршруту з вимкненим SSR. */
const declaredEmpty = (where) => {
	const rel = where.slice(`${BUILD}/`.length).replace(/index\.html$/, "");
	return noSsrRoutes.includes(rel);
};

/** Видимий текст тіла — те, що бачить пошуковик, а не байти розмітки. */
const bodyTextLength = (html) => {
	const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? "";
	return body
		.replace(/<script[\s\S]*?<\/script>/g, "")
		.replace(/<style[\s\S]*?<\/style>/g, "")
		.replace(/<[^>]+>/g, "")
		.trim().length;
};

for (const page of pages) {
	const html = readFileSync(page, "utf8");
	const where = page.replace(/\\/g, "/");

	// 1. Адреси пререндера. Знак того, що під час збірки взяли `page.url.origin`,
	//    а він у пререндері фальшивий.
	if (html.includes("sveltekit-prerender")) {
		fail(`${where}: в адресах лишився sveltekit-prerender`);
	}

	// 2. Мова сторінки. Порожній або відсутній lang — і читалка озвучує все
	//    голосом мови за замовчуванням системи.
	const lang = /<html[^>]*\blang="([^"]*)"/.exec(html)?.[1];
	if (!lang) fail(`${where}: у <html> немає атрибута lang`);

	// 2а. Порожнє тіло проти оголошеного `ssr = false` — див. довгий комментар
	//     вище про те, чому саме відповідність, а не просто заборона.
	if (!isFallback(where)) {
		const textLength = bodyTextLength(html);
		if (textLength < BODY_TEXT_MIN && !declaredEmpty(where)) {
			fail(
				`${where}: тіло майже порожнє (${textLength} символів тексту), а маршрут не оголошував ssr = false — ` +
					"сторінка потрапить в індекс без вмісту",
			);
		}
		if (textLength >= BODY_TEXT_MIN && declaredEmpty(where)) {
			fail(
				`${where}: маршрут оголосив ssr = false, але сторінка приїхала з тілом (${textLength} символів) — ` +
					"прапорець більше не потрібен, прибери його разом із цим винятком",
			);
		}
	}

	// 3. Заголовок і опис. Тут SSR вимкнено (`+page.ts`), тож зі `svelte:head`
	//    у розмітку не потрапляє НІЧОГО — обидва теги живуть статично в
	//    app.html, і зникнути можуть непомітно. Одного разу вже зникали.
	const title = /<title>([^<]*)<\/title>/.exec(html)?.[1]?.trim();
	if (!title || title.length < 5)
		fail(`${where}: порожній або надто короткий <title>`);

	const description = /<meta\s+name="description"\s+content="([^"]*)"/.exec(
		html,
	)?.[1];
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
		if (canonical)
			fail(`${where}: у прихованої сторінки не мусить бути canonical`);
		if (!/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) {
			fail(`${where}: прихована сторінка без noindex — вона потрапить у пошук`);
		}
	} else if (!canonical) fail(`${where}: немає <link rel="canonical">`);
	else if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) {
		fail(`${where}: звичайна сторінка з noindex — вона зникне з пошуку`);
	} else if (!canonical.startsWith(`${ORIGIN}${BASE}`)) {
		fail(
			`${where}: canonical «${canonical}» не починається з ${ORIGIN}${BASE}`,
		);
	} else if (/\.\/|\/\/$|\.\//.test(canonical.slice(ORIGIN.length))) {
		fail(`${where}: canonical «${canonical}» містить відносний фрагмент`);
	}

	// 4а. У кожного мета-тега рівно один власник (SEO § 4.4,
	//     `SEO-HEAD-SINGLE-OWNER`, HIGH). `<svelte:head>` ДОПИСУЄ вміст, а не
	//     заміщує його, тож макет і сторінка, кожен по-своєму правий, разом
	//     дають два `og:image`, два `description` чи два `<title>` — і який із
	//     них візьме краулер, залежить від краулера. Браузер бере ПЕРШИЙ, а
	//     перший тут завжди статичний, із `app.html`: тобто власний тег
	//     сторінки виявляється мертвою розміткою, і в джерелах обидва місця
	//     виглядають правильно.
	//
	//     Саме так тут жив другий `<title>` на сторінці чеклиста: вкладка
	//     показувала загальну назву застосунку, а «Чеклист бета-тестування» не
	//     бачив ніхто. Знімає його `hooks.server.ts` — там, де вже знімається
	//     canonical.
	//
	//     Пробіли схлопуються перед підрахунком: prettier переносить довгий
	//     `<meta>` на кілька рядків, і однорядковий шаблон його не бачить —
	//     тобто мовчазний нуль замість знахідки.
	const flat = html.replace(/\s+/g, " ");
	const SINGLE_OWNER = [
		["<title>", /<title[\s>]/gi],
		['<meta name="description">', /<meta[^>]*\sname="description"/gi],
		['<meta name="robots">', /<meta[^>]*\sname="robots"/gi],
		['<link rel="canonical">', /<link[^>]*\srel="canonical"/gi],
		['<meta property="og:title">', /<meta[^>]*\sproperty="og:title"/gi],
		[
			'<meta property="og:description">',
			/<meta[^>]*\sproperty="og:description"/gi,
		],
		['<meta property="og:image">', /<meta[^>]*\sproperty="og:image"/gi],
	];
	for (const [name, pattern] of SINGLE_OWNER) {
		const times = (flat.match(pattern) ?? []).length;
		if (times > 1) {
			fail(
				`${where}: ${name} трапляється ${times} рази — у тега два власники ` +
					"(app.html і <svelte:head>), і діє лише перший",
			);
		}
	}

	// 5. CSP і хеші інлайн-скриптів. На статиці політика приїжджає мета-тегом і
	//    діє лише на те, що НИЖЧЕ за неї; скрипт без свого хеша блокується
	//    МОВЧКИ — сторінка малюється, просто щось перестає працювати
	//    (SECURITY-v8 § 6.2, § 6.3).
	const cspTag =
		/<meta\s+http-equiv="content-security-policy"\s+content="([^"]*)"/i.exec(
			html,
		);
	if (!cspTag) {
		fail(`${where}: у зібраному HTML немає політики безпеки`);
	} else {
		const policy = cspTag.group ?? cspTag[1];
		const policyAt = cspTag.index;
		const hashes = new Set(policy.match(/'sha256-[A-Za-z0-9+/=]+'/g) ?? []);

		for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/g)) {
			const bodyStart = m.index + m[0].length;
			const bodyEnd = html.indexOf("</script>", bodyStart);
			const body = html.slice(bodyStart, bodyEnd);
			const digest = `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
			const head = body.trim().split("\n")[0].slice(0, 40);

			if (m.index < policyAt) {
				fail(
					`${where}: інлайн-скрипт вище політики («${head}…») — вона його не покриває`,
				);
			}
			if (!hashes.has(digest)) {
				fail(
					`${where}: інлайн-скрипт («${head}…») не має хеша в script-src — буде заблокований`,
				);
			}
		}

		// 5а. Атрибути-обробники (SECURITY-v8 § 6.3.2). Родич попередньої
		//     перевірки, але лікується інакше: скрипт без хеша можна покрити
		//     хешем, а обробник — ні, хеші на них не поширюються. Єдиний вихід —
		//     прибрати розгортання атрибутів на тому елементі, тож повідомлення
		//     називає саме це.
		//
		//     Виняток на `'unsafe-hashes'` навмисно не передбачено: політика
		//     проєкту його не має, і поява його в політиці — це окреме рішення,
		//     яке має обговорюватися, а не тихо знімати цю перевірку.
		for (const m of html.matchAll(INLINE_HANDLER_ATTR)) {
			fail(
				`${where}: інлайновий обробник «${m[0].trim()}» — CSP його заблокує, ` +
					"а хеші на обробники не поширюються. У джерелах його немає: його " +
					"додає компілятор на елемент із розгортанням атрибутів",
			);
		}
	}

	// 8. Критичні ресурси сторінки лежать там, куди сторінка показує.
	//
	//    Клас, який ловиться лише тут: адреса ресурсу складається зі `base`, а
	//    `base` під час пререндеру й на хостингу — різні рядки. Сторінка з
	//    непрацездатним посиланням на CSS не падає й не порожніє: вона просто
	//    малюється без стилів, а весь JS не виконується. Оком це видно, а
	//    жодною з перевірок вище — ні.
	const critical = criticalAssets(html);
	for (const url of critical.urls) {
		const target = resolveAsset(page, url);
		if (target && !existsSync(target)) {
			fail(`${where}: ресурс «${url}» не існує у build/ (шукали ${target})`);
		}
	}
	if (critical.styles === 0)
		fail(`${where}: жодного <link rel="stylesheet"> — сторінка без стилів`);
	if (critical.scripts === 0)
		fail(`${where}: жодного modulepreload — сторінка без коду`);
}

/*
 * 8а. Сторінка, яку міряє Lighthouse, мусить вантажитися З КОРЕНЯ
 * (OBSERVABILITY § 2.2.1, `OBS-LHCI-REAL-PAGES`).
 *
 * LHCI піднімає власний сервер над `build/` і кладе його в КОРІНЬ, без
 * префікса `/Slovko`. Поки адреси ресурсів відносні (`./_app/...`), усе
 * сходиться. Щойно вони стануть абсолютними — а це рівно те, що робить `base`
 * на хостингу, — сервер LHCI поверне 404 на кожен файл, сторінка намалюється
 * без CSS і без JS, і Lighthouse дасть їй ВИСОКІ бали: порожній документ
 * швидкий, доступний і без помилок best practices.
 *
 * Тобто наслідок цієї поломки — не червоний гейт, а зелений. Саме тому
 * перевірка стоїть тут, у скрипті над `build/`, а не покладається на пороги
 * самого Lighthouse.
 *
 * Перелік адрес береться з `lighthouserc.cjs`, а не дублюється: розходження
 * двох копій було б наступним мовчазним дефектом.
 */
{
	const lhciFile = "lighthouserc.cjs";
	if (!existsSync(lhciFile)) {
		fail(`${lhciFile} не знайдено — перелік адрес Lighthouse перевіряти нічим`);
	} else {
		const config = readFileSync(lhciFile, "utf8");
		const urlBlock = /url:\s*\[([^\]]*)\]/.exec(config)?.[1] ?? "";
		const measured = [...urlBlock.matchAll(/['"]([^'"]+)['"]/g)].map(
			(m) => m[1],
		);

		if (measured.length === 0) {
			fail(`${lhciFile}: перелік адрес порожній або записаний інакше`);
		}

		for (const url of measured) {
			const path = url.replace(/^https?:\/\/[^/]+/, "").replace(/^\//, "");
			const file = join(BUILD, path);
			if (!existsSync(file)) {
				fail(
					`${lhciFile}: Lighthouse міряє «${url}», а ${file} у build/ немає — ` +
						"гейт або впаде, або зміряє не те",
				);
				continue;
			}
			const absolute = criticalAssets(readFileSync(file, "utf8")).urls.filter(
				(u) => u.startsWith("/"),
			);
			if (absolute.length > 0) {
				fail(
					`${file}: ресурси задані абсолютним шляхом (${absolute[0]}), а LHCI ` +
						"роздає build/ з КОРЕНЯ. Сторінка приїде без CSS і JS, і бали " +
						"будуть ВИСОКІ — порожній документ швидкий і доступний",
				);
			}
		}
	}
}

/*
 * Канарка для перевірки 5а. Нуль знахідок — очікуваний результат, і саме тому
 * він нічого не доводить: рівно так само виглядає зламана регулярка. Тому
 * перелік перевіряється на зразку, а не лише на сторінках
 * (AI-AGENT-PITFALLS-v8 § 1).
 */
{
	const positive =
		'<img src="x" onload="this.__e=event" onerror="this.__e=event">';
	const negative = '<div data-only="1" data-once="on" class="online"></div>';
	const hits = [...positive.matchAll(INLINE_HANDLER_ATTR)].length;
	if (hits !== 2) {
		fail(
			`перевірка інлайнових обробників зламана: на зразку з двома гачками знайдено ${hits}`,
		);
	}
	if (negative.match(INLINE_HANDLER_ATTR)) {
		fail(
			"перевірка інлайнових обробників збігається з `data-only`/`data-once` — " +
				"перелік імен підмінено на `on[a-z]+`",
		);
	}
}

// 6. Секрети в бандлі (SECURITY-v8 § 16). Клієнтський код публічний цілком.
const SECRET =
	/(API_SECRET|PRIVATE_KEY|SERVICE_ACCOUNT|BEGIN [A-Z ]*PRIVATE KEY)/;
for (const file of files.filter((f) => /\.(html|js|json|css)$/.test(f))) {
	if (SECRET.test(readFileSync(file, "utf8"))) {
		fail(`${file.replace(/\\/g, "/")}: схоже на секрет у зібраному виводі`);
	}
}

// 7. Файли, на які посилаються robots і маніфест, справді лежать поруч.
for (const asset of [
	"sitemap.xml",
	"robots.txt",
	"manifest.json",
	"service-worker.js",
]) {
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
	const entryPath = join(BUILD, "index.html");
	const entryHtml = existsSync(entryPath)
		? readFileSync(entryPath, "utf8")
		: "";
	const preloaded = new Set(
		[
			...entryHtml.matchAll(/immutable\/(?:chunks|entry|nodes)\/[\w.-]+\.js/g),
		].map((m) => m[0]),
	);
	// Канарка: якщо передзавантажених файлів немає взагалі, перевірка нічого не
	// доводить — їй просто не було на що дивитися (AI-AGENT-PITFALLS-v8 § 1).
	if (preloaded.size === 0) {
		fail(
			"index.html: немає жодного modulepreload — перевірку SDK нічим виконати",
		);
	} else {
		let found = 0;
		for (const rel of preloaded) {
			const file = join(BUILD, "_app", rel);
			if (
				existsSync(file) &&
				readFileSync(file, "utf8").includes("FirebaseError")
			) {
				fail(`SDK бази в критичному шляху: ${rel}`);
				found++;
			}
		}
		if (found === 0) {
			console.log(
				`check-build: SDK бази поза критичним шляхом (${preloaded.size} передзавантажених файлів)`,
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
	if (!existsSync(join(BUILD, route, "index.html"))) {
		fail(`build/${route}/index.html: прихованої сторінки немає в збірці`);
	}
	const sitemap = existsSync(join(BUILD, "sitemap.xml"))
		? readFileSync(join(BUILD, "sitemap.xml"), "utf8")
		: "";
	if (sitemap.includes(route))
		fail(`sitemap.xml: службова сторінка ${route} потрапила в мапу`);

	const robots = existsSync(join(BUILD, "robots.txt"))
		? readFileSync(join(BUILD, "robots.txt"), "utf8")
		: "";
	if (!robots.includes(`Disallow: ${BASE}/${route}/`)) {
		fail(`robots.txt: немає Disallow для ${route}`);
	}
}

// ---------------------------------------------------------------------------
// SEO-v8 § 7.5 — артефакти AI-пошуку (llms.txt і групи robots.txt).
//
// Розбір живе в `check-geo`, бо він робить власний парсер `robots.txt`:
// краулер, що збігся з іменованою групою, ігнорує `User-agent: *` цілком, тож
// пропущений там `Disallow` не «наслідується», а ВІДКРИВАЄ шлях саме цьому
// боту. У кількох майже однакових блоках очима така дірка не видно.
for (const msg of checkGeo(BUILD)) fail(msg);

if (failures.length > 0) {
	console.error(
		`Перевірка зібраного виводу знайшла ${failures.length} проблем:`,
	);
	for (const message of failures) console.error(`  • ${message}`);
	process.exit(1);
}

console.log(
	`Зібраний вивід у нормі: ${pages.length} сторінок, ${files.length} файлів.`,
);
