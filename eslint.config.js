import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import pluginAstro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig(
  { ignores: ['dist/', '.astro/', 'node_modules/', 'data/bgg-cache/', 'coverage/', 'playwright-report/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  ...pluginAstro.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  prettier,
);
