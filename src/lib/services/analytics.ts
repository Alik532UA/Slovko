import { browser, dev } from '$app/environment';

/**
 * Google Analytics 4 (ANALYTICS-v8 § 1).
 */
export const GA_ID_PLACEHOLDER = 'G-XXXXXXXXXX';

/**
 * ID лічильника Google Analytics 4.
 * Анотація `: string` обов'язкова, щоб TypeScript не звужував літерал.
 */
const GA_ID: string = import.meta.env.VITE_GA_ID || 'G-XXXXXXXXXX';

const isConfigured = GA_ID !== GA_ID_PLACEHOLDER && /^G-[A-Z0-9]{6,}$/.test(GA_ID);

const enabled = () => browser && !dev && isConfigured;

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
