import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Balises de l'appli installable (PWA) : seulement pour le site hébergé, pas pour le fichier artifact.
const pwaTags: Plugin = {
  name: 'declic-pwa-tags',
  transformIndexHtml: () => [
    { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.webmanifest' }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'icon', type: 'image/svg+xml', href: '/icons/icon.svg' }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'theme-color', content: '#EDF0F5', media: '(prefers-color-scheme: light)' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'theme-color', content: '#0A111E', media: '(prefers-color-scheme: dark)' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'Déclic' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }, injectTo: 'head' },
  ],
};

// `npm run build` : site statique dans dist/ (Vercel), installable sur téléphone.
// `npm run build:single` : un seul fichier HTML autonome (publiable tel quel), sans service worker.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react(), pwaTags],
  // Le dossier public/ (manifest, icônes, service worker) ne sert qu'au site hébergé.
  publicDir: mode === 'single' ? false : 'public',
  resolve: mode === 'single'
    ? { alias: { '@supabase/supabase-js': fileURLToPath(new URL('./src/state/supabase-stub.ts', import.meta.url)) } }
    : undefined,
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist' },
}));
