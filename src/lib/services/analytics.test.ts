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
		 * Ідентифікатора тут більше не стабимо, і це не спрощення.
		 *
		 * Доти `GA_ID` був `import.meta.env.VITE_GA_ID || 'G-XXXXXXXXXX'`: без
		 * змінної модуль бачив плейсхолдер, `isConfigured` було хибним, і цей
		 * позитивний контроль падав на `expected 0 to be greater than 0`.
		 * Локально він проходив лише тому, що поруч лежав `.env` — а `.env` у
		 * `.gitignore`, тож у CI його немає. Заміряно: прогін 35075608772.
		 *
		 * Лікували це `vi.stubEnv` — тобто симптом. Причину прибрано: значення
		 * тепер літерал у самому модулі (SECURITY-v9 § 4.2.1,
		 * `SEC-CONFIG-IN-SOURCE`), і вердикт тесту більше не залежить від того,
		 * що лежить у машині.
		 */
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
