import { defineConfig, devices } from '@playwright/test';

/**
 * Окремий порт саме для тестів, і свій у кожному проєкті.
 *
 * Було `5173` плюс `reuseExistingServer: !process.env.CI`. Локально це означало:
 * якщо на 5173 уже висить dev-сервер ІНШОГО проєкту (а 5173 — типовий порт
 * Vite, тобто в усіх сімох він той самий), Playwright спокійно бере його й
 * перевіряє чужий застосунок. Тест зелений, перевірено не те — рівно клас
 * AI-AGENT-PITFALLS-v8 § 1. Саме так і сталося: інваріант унікальності
 * `data-testid` проходив, дивлячись на сусідній сайт.
 */
const TEST_PORT = 5273;

/**
 * `baseURL` мусить враховувати `base` зі `svelte.config.js` (CODE-QUALITY-v8
 * § 5.4). Тут `base` — `/Slovko`, тож без нього `page.goto('/')` веде на адресу,
 * якої в застосунку немає. Досі це працювало лише тому, що Vite сам
 * перенаправляє корінь на базовий шлях — тобто перевірки трималися на
 * поведінці dev-сервера, а не на власній адресації.
 *
 * Наслідок для тестів: шляхи в них РЕЛЯТИВНІ (`''`, `'?modal=levels'`).
 * Провідний слеш у `new URL(path, baseURL)` відкидає базовий шлях цілком.
 */
const BASE_PATH = process.env.BASE_PATH ?? '/Slovko';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		trace: 'on-first-retry',
		baseURL: `http://localhost:${TEST_PORT}${BASE_PATH}/`,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		}
	],
	webServer: {
		// `--strictPort`: якщо порт зайнятий, Vite мусить УПАСТИ, а не тихо
		// перейти на наступний. Інакше Playwright перевіряв би сайт за адресою,
		// яку зайняв хтось інший.
		command: `npm run dev -- --port ${TEST_PORT} --strictPort`,
		url: `http://localhost:${TEST_PORT}`,
		// Ніколи не перевикористовуємо чужий сервер — див. коментар до TEST_PORT.
		reuseExistingServer: false,
	},
});