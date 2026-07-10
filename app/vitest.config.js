import { defineConfig } from 'vitest/config'

// Standalone Vitest config, kept separate from vite.config.js so the
// production Vite/PWA build config is never touched by the test harness.
export default defineConfig({
    test: {
        environment: 'node',
        globals: false,
        include: ['src/**/*.test.{js,jsx}']
    }
})
