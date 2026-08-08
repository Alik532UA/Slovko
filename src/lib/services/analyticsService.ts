/**
 * Analytics Service - Handles Google Analytics 4 integration
 */

export const GA_ID = import.meta.env.VITE_GA_ID;

// Without the DEV check every `npm run dev` session lands in the same property
// as real visitors, since .env carries a working ID locally.
const enabled = () =>
	typeof window !== "undefined" && !import.meta.env.DEV && !!GA_ID;

let started = false;

export const initGA = () => {
	if (!enabled() || started) return;
	started = true;

	// Initialize dataLayer and gtag
	window.dataLayer = window.dataLayer || [];
	window.gtag = function () {
		window.dataLayer.push(arguments);
	};

	window.gtag("js", new Date());
	// Page views are sent by hand from the layout on every navigation, so the
	// automatic one would double-count the first load.
	window.gtag("config", GA_ID, { send_page_view: false });

	// Load gtag.js script
	const script = document.createElement("script");
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
	document.head.appendChild(script);
};

/**
 * Track page view manually (useful for SPA transitions if automatic tracking is not enough)
 */
export const trackPageView = (path: string) => {
	if (!enabled()) return;
	// The layout effect can run before onMount's async init reaches initGA, so
	// this must not assume the other ran first. initGA is idempotent, and gtag
	// queues into dataLayer until its script arrives.
	initGA();
	// A second gtag("config") is the old Universal Analytics idiom: in GA4 it
	// re-initialises the tag and sends another page view of its own. Send the
	// event instead.
	window.gtag("event", "page_view", {
		page_location: `${window.location.origin}${path}`,
	});
};

/**
 * Track custom events
 */
export const trackEvent = (
	action: string,
	category: string,
	label?: string,
	value?: number,
) => {
	if (!enabled()) return;
	initGA();
	window.gtag("event", action, {
		event_category: category,
		event_label: label,
		value: value,
	});
};

// Add global type definition for gtag
declare global {
	interface Window {
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}
