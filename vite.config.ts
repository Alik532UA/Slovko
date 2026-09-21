import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
	plugins: [sveltekit()],
	/*
	 * `base` ТУТ НЕ ЗАДАЄТЬСЯ, і його прибрано, а не забуто.
	 *
	 * Стояло `base: "/Slovko/"`, і це не діяло: SvelteKit виставляє його з
	 * `paths.base` у `svelte.config.js` і власне значення однаково
	 * перекриває, друкуючи «The following Vite config options will be
	 * overridden by SvelteKit: - base» на кожному прогоні.
	 *
	 * Тобто це був не робочий параметр, а ДРУГЕ місце, де живе той самий
	 * шлях. Мовчазна розбіжність між ними нічого не ламала лише тому, що
	 * один із двох ігнорувався; наступний читач мав усі підстави правити
	 * саме його й дивуватися, чому нічого не змінилося.
	 */
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
		__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
	},
});
