import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa' // ★ 1. プラグインをインポート

export default defineConfig({
  plugins: [
    vue(),
    // ★ 2. PWAプラグインと設定を追加
    VitePWA({
      registerType: 'autoUpdate',
      // アプリの情報や「インストール」時の挙動を設定します
      manifest: {
        name: 'Thanks', // アプリのフルネーム
        short_name: 'Thanks', // ホーム画面に表示される短い名前
        description: '感謝をつなげるサービスです。', // アプリの説明
        theme_color: '#ee965fff', // アプリのテーマカラー
        background_color: '#fcf8f5', // スプラッシュ画面の背景色
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})