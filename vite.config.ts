import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 项目页部署时，资源需带 /lifeOS/ 前缀；设环境变量 GH_PAGES=1 构建即可。
// 本地 dev 与其它静态托管（自定义域名）仍用 '/'，保持 http://localhost:5173/ 直达。
// 用 globalThis 读取，避免引入 @types/node。
const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const base = env.GH_PAGES ? '/lifeOS/' : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-180.png'],
      manifest: {
        name: 'LifeOS · 个人生活管理',
        short_name: 'LifeOS',
        description: '手机优先的个人生活节奏管理工具：睡眠、工作、健身、阅读、英语、IT/AI 学习与中断重排。',
        lang: 'zh-CN',
        dir: 'ltr',
        // 跟随 base：项目页为 /lifeOS/，本地为 /
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b1220',
        theme_color: '#0f766e',
        categories: ['productivity', 'lifestyle'],
        // 用相对路径，自动相对 manifest 解析，base 变化时无需改
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true
      }
    })
  ],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 }
});
