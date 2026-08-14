import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [
		svelte({ hot: !process.env.VITEST }),
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		// `node`, а не `jsdom`: пакета `jsdom` у проєкті немає, і через це
		// `pluralize.test.ts` не запускався зовсім — vitest не міг підняти для
		// нього воркер. Два інші файли це обходили докблоком
		// `// @vitest-environment node`, третій — ні, і його падіння виглядало
		// як «2 passed» плюс окремий рядок про помилку.
		//
		// Жодному з наявних тестів DOM не потрібен. Якщо колись знадобиться —
		// поставити `jsdom` у devDependencies і закріпити середовище саме в
		// тому файлі докблоком, а не глобально.
		environment: 'node',
		globals: true,
	}
});