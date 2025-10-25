// eslint.config.js

import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// ----------------------------------------------------
// 👈 追加: 必要なパッケージをインポート
// ----------------------------------------------------
import tseslint from 'typescript-eslint'      // TypeScript用パーサーとルール
import pluginImport from 'eslint-plugin-import'  // インポート関連ルール

export default defineConfig([
  {
    name: 'app/files-to-lint',
    // 👈 監視対象に .ts, .tsx を追加
    files: ['**/*.{js,mjs,jsx,ts,tsx,vue}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node, // 👈 Node.js環境（ビルド時など）も許可
      },
    },
  },

  // 1. 基本的なJavaScriptルール
  js.configs.recommended,

  // ----------------------------------------------------
  // 👈 追加: TypeScriptの推奨ルール
  // ----------------------------------------------------
  ...tseslint.configs.recommended,

  // 2. Vue.jsの必須ルール
  ...pluginVue.configs['flat/essential'],

  // ----------------------------------------------------
  // 👈 追加: Vueファイル内の <script lang="ts"> をTSとして解析する設定
  // ----------------------------------------------------
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        // 👈 Vueファイル内の<script>をTypeScriptパーサーで解析
        parser: tseslint.parser,
      },
    },
  },

  // ----------------------------------------------------
  // 👈 追加: インポート解決（ご要望の「赤波線」機能）
  // ----------------------------------------------------
  {
    name: 'app/import-rules',
    plugins: {
      import: pluginImport,
    },
    settings: {
      // 👈 'import/resolver' の設定
      'import/resolver': {
        // 👈 tsconfig.json (pathsエイリアス等) を読み込む
        typescript: true,
        node: true,
      },
    },
    rules: {
      // 🚨 これが「解決できないインポート」を検出するルールです
      'import/no-unresolved': 'error',

      // --- 以下は推奨されるインポート関連ルール ---
      'import/named': 'error',      //名前付きexportのtypoなどを検出
      'import/namespace': 'error',  // 'import * as ...' のtypoを検出
      'import/default': 'error',    // default exportのtypoを検出
      'import/export': 'error',     // export関連の問題を検出
    },
  },

  // 3. Prettier連携（必ず最後に配置）
  skipFormatting,
])
