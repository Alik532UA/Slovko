import { describe, expect, it, vi, beforeEach } from 'vitest';

let mockDev = true;

vi.mock('$app/environment', () => ({
	browser: true,
	get dev() {
		return mockDev;
	}
}));

describe('Slovko analytics guards (ANALYTICS-v9 § 5.1)', () => {
	let mockDataLayer: unknown[] = [];

	beforeEach(() => {
		vi.resetModules();
		mockDev = true;
		mockDataLayer = [];

		vi.stubGlobal('window', {
			location: { hostname: 'localhost', origin: 'http://localhost:5273', pathname: '/Slovko/' },
			get dataLayer() {
				return mockDataLayer;
			},
			set dataLayer(val) {
				mockDataLayer = val;
			}
		});

		vi.stubGlobal('navigator', {
			webdriver: false
		});

		vi.stubGlobal('document', {
			createElement: vi.fn(() => ({})),
			head: {
				appendChild: vi.fn()
			}
		});
	});

	it('мовчить у dev-режимі', async () => {
		mockDev = true;
		const { track, trackPageView, initAnalytics } = await import('./analytics');
		initAnalytics();
		track('game_start', { mode: 'daily' });
		trackPageView('/Slovko/');

		expect(mockDataLayer).toHaveLength(0);
	});

	it('мовчить на localhost навіть при dev: false (preview/локальні тести)', async () => {
		mockDev = false;
		vi.stubGlobal('window', {
			location: { hostname: 'localhost', origin: 'http://localhost:5273', pathname: '/Slovko/' },
			dataLayer: mockDataLayer
		});

		const { track, trackPageView, initAnalytics } = await import('./analytics');
		initAnalytics();
		track('game_start', { mode: 'daily' });
		trackPageView('/Slovko/');

		expect(mockDataLayer).toHaveLength(0);
	});

	it('мовчить при navigator.webdriver: true навіть на робочому домені', async () => {
		mockDev = false;
		vi.stubGlobal('window', {
			location: { hostname: 'alik532ua.github.io', origin: 'https://alik532ua.github.io', pathname: '/Slovko/' },
			dataLayer: mockDataLayer
		});
		vi.stubGlobal('navigator', {
			webdriver: true
		});

		const { track, trackPageView, initAnalytics } = await import('./analytics');
		initAnalytics();
		track('game_start', { mode: 'daily' });
		trackPageView('/Slovko/');

		expect(mockDataLayer).toHaveLength(0);
	});

	it('працює у продакшені (не dev, не localhost, не webdriver)', async () => {
		mockDev = false;
		/*
		 * Ідентифікатор задається ТУТ, а не береться з середовища.
		 *
		 * `GA_ID` тут — `import.meta.env.VITE_GA_ID || 'G-XXXXXXXXXX'`, тобто без
		 * змінної модуль бачить плейсхолдер, `isConfigured` хибне, і позитивний
		 * контроль падає на `expected 0 to be greater than 0`. Локально він
		 * проходив лише тому, що поруч лежить `.env` — а `.env` у `.gitignore`,
		 * тож у CI його немає. Заміряно: прогін 35075608772, перший після
		 * переходу на цей набір тестів.
		 *
		 * Юніт-тест, чий вердикт залежить від змінної оточення, перевіряє не код,
		 * а конфігурацію машини. Тому значення стабиться явно.
		 */
		vi.stubEnv('VITE_GA_ID', 'G-TESTONLY01');
		vi.stubGlobal('window', {
			location: { hostname: 'alik532ua.github.io', origin: 'https://alik532ua.github.io', pathname: '/Slovko/' },
			get dataLayer() {
				return mockDataLayer;
			},
			set dataLayer(val) {
				mockDataLayer = val;
			}
		});
		vi.stubGlobal('navigator', {
			webdriver: false
		});

		const { trackPageView, initAnalytics } = await import('./analytics');
		initAnalytics();
		trackPageView('/Slovko/');

		expect(mockDataLayer.length).toBeGreaterThan(0);
	});
});
