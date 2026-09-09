import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
	plugins: [svelte({ hot: !process.env.VITEST })],
	resolve: {
		alias: {
			// Псевдонім `$lib` дає SvelteKit, а не Vite, — і під vitest його
			// немає. Доти це не заважало лише тому, що єдиний тест, який тягнув
			// `$lib`, той модуль ще й підміняв через `vi.mock`: підміна
			// перехоплює специфікатор і до резолву справа не доходить. Перший же
			// СПРАВЖНІЙ імпорт по `$lib` падав із «Cannot find module».
			$lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
		},
	},
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
		// `node`, а не `jsdom`: пакета `jsdom` у проєкті немає, і через це
		// `pluralize.test.ts` не запускався зовсім — vitest не міг підняти для
		// нього воркер. Два інші файли це обходили докблоком
		// `// @vitest-environment node`, третій — ні, і його падіння виглядало
		// як «2 passed» плюс окремий рядок про помилку.
		//
		// Жодному з наявних тестів DOM не потрібен. Якщо колись знадобиться —
		// поставити `jsdom` у devDependencies і закріпити середовище саме в
		// тому файлі докблоком, а не глобально.
		environment: "node",
		globals: true,
	},
});
