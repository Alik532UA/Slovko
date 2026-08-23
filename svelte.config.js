import adapter from "@sveltejs/adapter-static";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * SvelteKit чекає літеральний тип (`"" | `/${string}``), а не широкий `string`.
 * Приведення тут не косметика: до 2026-08-23 цей файл НЕ перевірявся типами
 * узагалі (`svelte-check` дивиться на `src/`, а конфіг імпортували лише
 * `scripts/` та `e2e/`). Щойно його зажадав інваріант із `src/`
 * (`csp-hash.test.ts`), виявилося шість латентних невідповідностей — усі
 * саме такого роду.
 *
 * @type {`/${string}`}
 */
const basePath = /** @type {`/${string}`} */ (process.env.BASE_PATH || "/Slovko");

/**
 * Хеші інлайн-скриптів `app.html` обчислюються зі збірки, а не вписуються
 * руками: вписаний хеш розходиться з файлом при першому ж редагуванні, і
 * скрипт після цього блокується МОВЧКИ — сторінка малюється, просто щось
 * перестає працювати.
 *
 * Тут їх два, і обидва мусять виконатися до гідратації:
 *   1. бутстрап теми — інакше блимає світлим на темній темі;
 *   2. діагностика падінь — вона ловить помилки, через які застосунок так і не
 *      відрендериться, тож пізніше її ставити нема сенсу.
 *
 * `mode: 'auto'` дає nonce у dev і хеші у пререндері. `unsafe-inline` тут НЕ
 * вживається навмисно: за наявності хешів браузер його ігнорує (CSP Level 2),
 * тож він створював би оманливе відчуття запасного варіанта.
 *
 * @returns {`sha256-${string}`[]} Саме літеральний тип, а не `string[]`:
 * `script-src` у SvelteKit типізований проти нього, і один широкий елемент
 * розширює ЦІЛИЙ масив директиви — через що падали й сусідні рядки з адресами,
 * яких ніхто не чіпав.
 */
function inlineScriptHashes() {
	const html = readFileSync("src/app.html", "utf8");
	const open = "<script>";
	const close = "</" + "script>";

	/** @type {`sha256-${string}`[]} */
	const hashes = [];
	let from = 0;
	for (;;) {
		const start = html.indexOf(open, from);
		if (start < 0) break;
		const end = html.indexOf(close, start);
		if (end < 0) break;
		// CRLF → LF перед хешуванням: браузер хешує текстовий вузол ПІСЛЯ розбору
		// HTML, а розбір нормалізує переноси («preprocessing the input stream»).
		// Тут `app.html` наразі з LF, тож рядок нічого не змінює — але без нього
		// правильність трималася б на випадковості: один свіжий клон на Windows, і
		// в політику поїде хеш, якого браузер не приймає, а заблокований скрипт
		// першого кадру нічого видимого не ламає. Заміряно 2026-08-23 у
		// `teatralo4ka` (зникла заставка) і `DigitalWorkshop` (мигала тема).
		const body = html.slice(start + open.length, end).replace(/\r\n/g, "\n");
		hashes.push(
			/** @type {`sha256-${string}`} */ (
				`sha256-${createHash("sha256").update(body).digest("base64")}`
			),
		);
		from = end + close.length;
	}

	if (hashes.length !== 2) {
		throw new Error(
			`app.html: очікувалось 2 інлайн-скрипти (тема + діагностика), знайдено ${hashes.length}. ` +
				"CSP заблокувала б їх мовчки — онови цей перелік разом із app.html.",
		);
	}
	return hashes;
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: "build",
			assets: "build",
			fallback: "404.html",
			precompress: false,
			strict: true,
		}),
		/**
		 * Домени взято зі стека проєкту, а не зі здогадок: Firebase Auth,
		 * Firestore, Realtime Database і Google Analytics. Забути `connect-src`
		 * означає, що запити блокуються мовчки, а код виглядає робочим.
		 *
		 * Орієнтир — конфіг `teatralo4ka.odesa.ua`, зібраний із реального
		 * відлагодження в консолі браузера на тому самому наборі сервісів.
		 */
		csp: {
			mode: "auto",
			directives: {
				"default-src": ["self"],
				"script-src": [
					"self",
					...inlineScriptHashes(),
					"https://www.googletagmanager.com",
					"https://apis.google.com",
					// reCAPTCHA, яку Firebase Auth підтягує сам у рантаймі: у бандлі
					// цих адрес немає, вони з'являються лише в консолі браузера.
					"https://www.google.com",
					"https://www.gstatic.com",
				],
				"connect-src": [
					"self",
					// Firestore і решта Google API.
					"https://*.googleapis.com",
					// Realtime Database — і https, і сокет: SDK тримає постійне
					// з'єднання, тож без wss синхронізація тихо не працює.
					"https://*.firebaseio.com",
					"https://*.firebasedatabase.app",
					"wss://*.firebasedatabase.app",
					// Оновлення токена сесії.
					"https://securetoken.google.com",
					"https://*.google-analytics.com",
					"https://*.analytics.google.com",
					// reCAPTCHA не лише завантажується, а й шле власні запити.
					"https://www.google.com",
					// Клієнт Google API шле телеметрію на /js/gen_204.
					"https://apis.google.com",
				],
				"img-src": ["self", "data:", "blob:", "https:"],
				"style-src": ["self", "unsafe-inline"],
				"font-src": ["self", "data:"],
				// Вхід через Google відкривається в iframe, який ставить Firebase Auth.
				"frame-src": [
					"self",
					"https://*.firebaseapp.com",
					"https://accounts.google.com",
					"https://www.google.com",
				],
				// Firebase App Check створює Worker із blob-адреси. Задається явно, а
				// не через фолбек на `script-src`: у dev політика приходить заголовком
				// із nonce, у пререндері — мета-тегом без нього, і поведінка фолбеку
				// в цих двох випадках різна.
				"worker-src": ["self", "blob:"],
				"object-src": ["none"],
				"base-uri": ["self"],
				"form-action": ["self"],
			},
		},
		paths: {
			base: basePath,
		},
		serviceWorker: {
			register: false,
		},
		prerender: {
			handleHttpError: ({ path, referrer, message }) => {
				if (path.endsWith("manifest.json")) {
					return;
				}

				throw new Error(message);
			},
		},
	},
};

export default config;
