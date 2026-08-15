import svelteParser from "svelte-eslint-parser";
import sveltePlugin from "eslint-plugin-svelte";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";

export default [
	{
		// Global ignores
		ignores: ["build/", ".svelte-kit/", "dist/", "node_modules/", "static/"],
	},
	{
		// Config files and scripts (non-project files)
		files: ["*.js", "*.cjs", "scripts/**/*.js", "src/service-worker.js"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: null,
			},
		},
		rules: {
			"no-undef": "off",
		},
	},
	{
		// TypeScript files
		files: ["src/**/*.ts"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: null,
			},
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ 
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_"
				},
			],
			"@typescript-eslint/ban-ts-comment": "off",
		},
	},
	{
		// Svelte files
		files: ["src/**/*.svelte"],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser,
				project: null,
				extraFileExtensions: [".svelte"],
			},
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
			svelte: sveltePlugin,
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			...sveltePlugin.configs.recommended.rules,
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ 
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_"
				},
			],
			"svelte/no-at-html-tags": "warn",
		},
	},
	{
		/**
		 * Базовий набір за CODE-QUALITY-v8 § 6.4.1.
		 *
		 * Конфіг вище задає правила окремо для `.ts` і для `.svelte`, тож
		 * загальні правила пакета не мали де жити взагалі — і половини з них у
		 * проєкті просто не було. Блок один на обидва розширення.
		 *
		 * Правило з нулем порушень стоїть у `error` — щоб нуль лишався
		 * перевіреним. Там, де борг є, стоїть `warn` із числом: `off` ховає борг
		 * і робить його невимірним. Числа заміряні 2026-08-14 і мають лише
		 * зменшуватися.
		 */
		files: ["src/**/*.ts", "src/**/*.svelte"],
		plugins: {
			"@typescript-eslint": tsPlugin,
			svelte: sveltePlugin,
		},
		rules: {
			// Анти-патерни SVELTE-CORE-v8 § 6. Нуль звернень: проєкт уже на рунах.
			// `get` не заборонений — `svelte-i18n` store-based за архітектурою, і
			// читати з нього поза компонентом інакше не можна.
			"no-restricted-imports": [
				"error",
				{
					paths: [
						{
							name: "svelte/store",
							importNames: ["writable", "readable", "derived"],
							message:
								"Svelte 5: стан — $state/$derived у класі-контролері (.svelte.ts). SVELTE-CORE-v8, анти-патерни.",
						},
						{
							name: "$app/stores",
							message:
								'Deprecated із SvelteKit 2.12: `import { page } from "$app/state"`. SVELTE-CORE-v8 § 1.8.',
						},
					],
				},
			],

			// SECURITY-v8 § 13. Нуль звернень; CSP цих конструкцій не дозволяє,
			// тож помилка виявилася б лише в рантаймі у відвідувача.
			"no-eval": "error",
			"no-implied-eval": "error",
			"no-new-func": "error",
			"no-script-url": "error",

			// I18N-v8 § 4.3, HIGH. Нуль звернень після переходу звіту логів на
			// ISO. Для проєкту із сімома мовами правило не декоративне: без
			// аргументу метод бере локаль СИСТЕМИ, а не мову інтерфейсу.
			"no-restricted-syntax": [
				"error",
				{
					selector:
						"CallExpression[arguments.length=0][callee.property.name=/^toLocale(String|DateString|TimeString)$/]",
					message:
						"I18N-v8 § 4.3: передайте локаль явно — без неї береться локаль системи, а не мова сайту.",
				},
			],

			// CODE-QUALITY-v8 § 1: `@ts-ignore` без причини. Нуль звернень.
			"@typescript-eslint/ban-ts-comment": "error",

			// DEBUGGING-v8 § 4. Правило, якого тут не було зовсім, — і саме тому
			// три `console.log` із налагодження перетягування карток доїхали в
			// продакшн. Це не косметика: подія в консолі не потрапляє ні в
			// кільцевий буфер, ні у звіт, який користувач надсилає розробнику,
			// тобто дефект видно лише тому, у кого відкриті DevTools.
			// Право писати в консоль має логер (виняток нижче).
			"no-console": "error",

			// ACCESSIBILITY-v8 § 10.5: a11y-попередження компілятора. Нуль.
			"svelte/valid-compile": "error",

			// SECURITY-v8 § 5. Єдиний {@html} винесено у файловий виняток нижче.
			"svelte/no-at-html-tags": "error",

			// --- Борг, що мігрується окремими комітами ---

			// SEO-v8 § 1.5. 12 місць. resolve() типізований проти списку реальних
			// маршрутів, тож помилка в адресі стає помилкою компіляції.
			"svelte/no-navigation-without-resolve": "warn",

			// SVELTE-UI-v8 § 1.5, HIGH. 5 місць. Ціна ключа не нульова: дублікат
			// кидає помилку в РАНТАЙМІ, тож ключ береться з поля, яке код і так
			// вважає унікальним, а не з першого-ліпшого рядка.
			"svelte/require-each-key": "warn",

			// SVELTE-CORE-v8 § 1.5. 2 місця: голі Set/Map/Date там, де очікується
			// реактивність.
			"svelte/prefer-svelte-reactivity": "warn",
		},
	},
	{
		/**
		 * DEBUGGING-v8 § 4 називає єдиний законний виняток — сам логер. Тут їх
		 * два, і другий не з лінощів:
		 *
		 *   1. `logService.svelte.ts` — власне реалізація виводу.
		 *   2. `storage/storageProvider.ts` — фасад сховища. Логер зберігає свій
		 *      буфер ЧЕРЕЗ цей фасад, тож зворотний імпорт замкнув би цикл, і в
		 *      момент, коли фасад найпотрібніший (переповнене сховище), логера
		 *      могло б іще не існувати. Межа файлова, а не проєктна.
		 *
		 * `service-worker.js` сюди не входить: він живе поза застосунком, логера
		 * не бачить у принципі, і його `console.warn` — єдиний спосіб щось
		 * сказати.
		 */
		files: [
			'src/lib/services/logService.svelte.ts',
			'src/lib/services/storage/storageProvider.ts',
			'src/service-worker.js'
		],
		rules: {
			'no-console': 'off'
		}
	},
	{
		/**
		 * SECURITY-v8 § 5.3 — {@html} без санітизації дозволений, коли джерело не
		 * може бути введенням користувача.
		 *
		 * Тут підставляється `langName` — назва мови зі словника перекладів,
		 * знайдена за `speechModalStore.lang`, тобто за внутрішнім станом із
		 * переліку підтримуваних мов. Розмітка (`<strong>`) теж наша.
		 *
		 * Виняток файловий: у решті компонентів новий {@html} тепер валить збірку.
		 */
		files: ["src/lib/components/ui/SpeechErrorModal.svelte"],
		rules: {
			"svelte/no-at-html-tags": "off",
		},
	},
	prettierConfig,

	/**
	 * STORAGE-NAMESPACE-v8, Крок 3: прямий доступ до Web Storage заборонений.
	 *
	 * Origin спільний із сусідніми проєктами, тож ключ без префікса — це не
	 * дрібниця, а чужі дані. Доти заборона трималася лише на рядку в AGENTS.md,
	 * і три проєкти з восьми вже її порушували, чого не помітив ніхто.
	 *
	 * Правил два, і друге не зайве: `no-restricted-globals` НЕ ловить
	 * `window.localStorage`. Канон у Кроці 3 наводить лише його — а саме ця
	 * форма й трапилася в DigitalWorkshop, тричі поспіль.
	 */
	{
		rules: {
			'no-restricted-globals': [
				'error',
				{ name: 'localStorage', message: 'STORAGE-NAMESPACE-v8: лише через фасад storage.' },
				{ name: 'sessionStorage', message: 'STORAGE-NAMESPACE-v8: лише через фасад storage.' }
			],
			'no-restricted-properties': [
				'error',
				{ object: 'window', property: 'localStorage', message: 'STORAGE-NAMESPACE-v8: лише через фасад storage.' },
				{ object: 'window', property: 'sessionStorage', message: 'STORAGE-NAMESPACE-v8: лише через фасад storage.' }
			]
		}
	},
	{
		// Три категорії, і кожна законна за самим каноном:
		//   1. Фасад — тут прямий доступ Є реалізацією (Крок 3).
		//   2. Модуль міграції — читає ключі БЕЗ префікса, і це єдине легальне
		//      місце, де так можна (Крок 4). Лежить у services/ або utils/
		//      залежно від проєкту, тому шаблон без шляху.
		//   3. Тести фасаду й e2e — вони мусять читати й засівати сирі ключі,
		//      інакше нічим довести, що префікс справді додається.
		files: [
			'src/lib/services/storage.ts',
			'src/lib/services/storage/**',
			'src/lib/config/storage.ts',
			'**/storageMigration.ts',
			'**/storage.test.ts',
			'**/storage.spec.ts',
			'tests/**',
			'e2e/**'
		],
		rules: {
			'no-restricted-globals': 'off',
			'no-restricted-properties': 'off'
		}
	}
];
