import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// Build stamp shown in More > About (W40). Cloudflare Pages exposes the commit
// as CF_PAGES_COMMIT_SHA; locally ask git; otherwise 'dev'. Never throws.
function buildCommit() {
    const fromCi = process.env.CF_PAGES_COMMIT_SHA
    if (fromCi) return fromCi.slice(0, 7)
    try {
        return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
            .toString().trim().slice(0, 7) || 'dev'
    } catch {
        return 'dev'
    }
}

export default defineConfig({
    define: {
        __APP_BUILD__: JSON.stringify({ commit: buildCommit(), builtAt: new Date().toISOString() })
    },
    // Treat CSV files as raw text assets (imported with ?raw suffix)
    assetsInclude: ['**/*.csv'],
    optimizeDeps: {
        exclude: ['src/data/playbook.csv']
    },
    plugins: [
        react(),
        VitePWA({
            // W40: 'prompt' = a new worker installs and WAITS (no skipWaiting /
            // clientsClaim; the generated sw.js only skips waiting on a
            // {type:'SKIP_WAITING'} message). injectRegister is false because
            // registration is hand-written in src/swUpdate.js — the plugin's own
            // register.js would reload every window on a controller change.
            // Do not set workbox.skipWaiting/clientsClaim here.
            registerType: 'prompt',
            injectRegister: false,
            includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png'],
            manifest: {
                name: 'Combat OS',
                short_name: 'Combat OS',
                description: 'Combat OS — Combat Performance Training System',
                // Explicit id equal to the one browsers derive from start_url
                // ("/" resolves to the same origin URL), so existing installs
                // keep their identity. Changing it would orphan them (W38).
                id: '/',
                theme_color: '#0a0a14',
                background_color: '#0a0a14',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                scope: '/',
                // Lets a browser tab ask whether this app is already installed
                // (navigator.getInstalledRelatedApps). Self-referencing (W38).
                related_applications: [
                    { platform: 'webapp', url: 'https://train.metzcore.com/manifest.webmanifest' }
                ],
                icons: [
                    {
                        src: 'icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'icon-512-maskable.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,csv}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
                        }
                    }
                ]
            }
        })
    ]
})
