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
				{ argsIgnorePattern: "^_" },
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
				{ argsIgnorePattern: "^_" },
			],
			"svelte/no-at-html-tags": "warn",
		},
	},
	prettierConfig,
];