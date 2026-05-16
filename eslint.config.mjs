import js from "@eslint/js";
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import svelte from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import prettier from "eslint-config-prettier";
import ts from "typescript-eslint";
import globals from "globals";

export default defineConfig([
	{
		ignores: [
			"node_modules/**",
			"dist/**",
			"main.js",
			"package.json",
			"package-lock.json",
			"versions.json",
			"eslint.config.*",
			"esbuild.config.mjs",
		],
	},

	js.configs.recommended,

	...obsidianmd.configs.recommended,

	...svelte.configs["flat/recommended"],
	...svelte.configs["flat/prettier"],

	{
		files: ["**/*.ts"],
		extends: [...ts.configs.recommendedTypeChecked],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},

	{
		files: ["src/**/*.svelte"],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsparser,
				extraFileExtensions: [".svelte"],
			},
			globals: {
				...globals.browser,
			},
		},
		rules: {
			"@typescript-eslint/no-deprecated": "off",
		},
	},

	{
		files: ["scripts/**/*.ts"],
		rules: {
			"import/no-nodejs-modules": "off",
		},
	},
	{
		files: ["scripts/**/*.ts", "*.mjs"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
		rules: {
			"import/no-nodejs-modules": "off",
		},
	},
	prettier,
]);
