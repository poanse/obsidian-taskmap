// eslint.config.mjs
import ts from "typescript-eslint";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import svelte from "eslint-plugin-svelte";
import prettier from "eslint-config-prettier";
import js from "@eslint/js";

export default defineConfig([
	...obsidianmd.configs.recommended,
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs["flat/recommended"],
	prettier,
	...svelte.configs["flat/prettier"],
	{
		files: ["**/*.ts", "**/*.svelte"],
		languageOptions: {
			parser: ts.parser,
			parserOptions: { project: "./tsconfig.json" },
		},

		// You can add your own configuration to override or add rules
		rules: {
			// example: turn off a rule from the recommended set
			// "obsidianmd/sample-names": "off",
			// example: add a rule not in the recommended set and set its severity
			// "obsidianmd/prefer-file-manager-trash": "error",
		},
	},
]);
