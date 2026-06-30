import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,ttf,webmanifest}'],
        navigateFallback: '/',
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'Puente de Vida — Coordinación de Emergencias',
        short_name: 'Puente de Vida',
        description: 'Plataforma offline-first para reportar y coordinar emergencias.',
        start_url: '/',
        display: 'standalone',
        background_color: '#f4f5f7',
        theme_color: '#ef3b56',
        orientation: 'portrait',
        icons: [
          { src: '/brand/v-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    port: 3000,
  },
});
