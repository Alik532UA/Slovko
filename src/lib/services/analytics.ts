import { browser, dev } from '$app/environment';

/**
 * Google Analytics 4 (ANALYTICS-v9 § 1).
 */
/**
 * ID лічильника Google Analytics 4.
 *
 * СТОЇТЬ ТУТ, А НЕ У ЗМІННІЙ CI. Значення публічне за побудовою: воно в
 * адресі запиту до `googletagmanager.com` на кожній сторінці. Лічильник один,
 * тобто сценарію «та сама збірка, інший рахунок» не існує
 * (SECURITY-v9 § 4.2.1, `SEC-CONFIG-IN-SOURCE`).
 *
 * Ціну змінної тут уже заплатили, і вона записана в `analytics.test.ts`:
 * позитивний контроль проходив ЛОКАЛЬНО, бо поруч лежав `.env`, і падав у CI,
 * де `.env` немає (прогін 35075608772). Юніт-тест, чий вердикт залежить від
 * змінної оточення, перевіряє не код, а конфігурацію машини.
 *
 * Разом зі змінною зник і плейсхолдер `G-XXXXXXXXXX`: він існував тільки
 * заради стану «змінної немає».
 *
 * Анотація `: string` обов'язкова, щоб TypeScript не звужував літерал.
 */
const GA_ID: string = 'G-FZPGZHT4CC';

/*
 * Перевірка лишилася, хоч значення вже не може бути порожнім: вона стереже
 * правку самого літерала. Неправильний ідентифікатор не ламає сторінку — він
 * тихо шле події в нікуди, і помітити це можна лише за порожнім звітом.
 */
const isConfigured = /^G-[A-Z0-9]{6,}$/.test(GA_ID);

/**
 * Локальне середовище або автоматизований тест (Playwright, Puppeteer тощо).
 * Запобігає засміченню аналітики під час розробки, локального прев'ю та E2E-тестів.
 */
const isTestOrLocal = () => {
	if (!browser || typeof window === 'undefined') return false;
	const hostname = window.location?.hostname ?? '';
	const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
	const isWebDriver = typeof navigator !== 'undefined' && Boolean(navigator.webdriver);
	return isLocal || isWebDriver;
};

// `dev`, `localhost` та автотести відключають аналітику, щоб тестовий трафік не потрапляв у продакшн.
const enabled = () => browser && !dev && !isTestOrLocal() && isConfigured;

export type AnalyticsEvent =
	| 'game_start'
	| 'game_finish'
	| 'word_guess'
	| 'level_select'
	| 'topic_select'
	| 'theme_change'
	| 'language_change'
	| 'section_view'
	| 'service_badge_click';

type EventParams = Record<string, string | number | boolean>;

declare global {
	interface Window {
		dataLayer?: unknown[];
		gtag?: (...args: unknown[]) => void;
	}
}

let started = false;

export function initAnalytics() {
	if (!enabled() || started) return;
	started = true;

	const dataLayer = (window.dataLayer = window.dataLayer ?? []);
	window.gtag = function gtag() {
		// `arguments`, а не rest-параметр: GA очікує в `dataLayer` рівно той
		// arguments-об'єкт, який отримав шим, і `[...args]` дає масив, який
		// gtag.js не розбирає. Директиви `eslint-disable prefer-rest-params`
		// тут раніше стояло — і воно нічого не вимикало, бо правила немає в
		// конфігу; `--report-unused-disable-directives` рахував його окремим
		// попередженням. Вимкнення, яке виглядає зробленим і не зроблене.
		dataLayer.push(arguments);
	};

	window.gtag('js', new Date());
	window.gtag('config', GA_ID, { send_page_view: false });

	const script = document.createElement('script');
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
	document.head.appendChild(script);
}

export const initGA = initAnalytics;

export function trackPageView(path?: string) {
	if (!enabled()) return;
	initAnalytics();
	const targetPath = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
	const origin = typeof window !== 'undefined' ? window.location.origin : '';
	window.gtag?.('event', 'page_view', { page_location: `${origin}${targetPath}` });
}

export function track(event: AnalyticsEvent, params: EventParams = {}) {
	if (!enabled()) return;
	initAnalytics();
	window.gtag?.('event', event, params);
}

export function trackEvent(
	action: string,
	category: string,
	label?: string,
	value?: number
) {
	if (!enabled()) return;
	initAnalytics();
	window.gtag?.('event', action, {
		event_category: category,
		event_label: label,
		value: value
	});
}
