import svelteParser from "svelte-eslint-parser";
import sveltePlugin from "eslint-plugin-svelte";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";

export default [
	{
		// Global ignores
		ignores: ["build/", ".svelte-kit/", "dist/", "node_modules/", "static/"]
	},
	{
		// Config files and scripts (non-project files)
		files: ["*.js", "*.cjs", "scripts/**/*.js", "src/service-worker.js"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: null
			}
		},
		rules: {
			"no-undef": "off"
		}
	},
	{
		// TS files in src/lib
		files: ["src/lib/**/*.ts"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: "./tsconfig.json"
			}
		},
		plugins: {
			"@typescript-eslint": tsPlugin
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"@typescript-eslint/ban-ts-comment": "off" // Allow simple @ts-ignore/@ts-expect-error
		}
	},
	{
		// Svelte files and TS files in routes (less strict parsing)
		files: ["src/**/*.svelte", "src/routes/**/*.ts"],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser,
				project: null, // Don't use project for routes/svelte to avoid "file not in project" errors
				extraFileExtensions: [".svelte"]
			}
		},
		plugins: {
			svelte: sveltePlugin
		},
		rules: {
			...sveltePlugin.configs.recommended.rules,
			"svelte/no-at-html-tags": "warn"
		}
	},
	prettierConfig
];
