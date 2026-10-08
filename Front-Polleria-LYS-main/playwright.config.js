import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', fullyParallel: true,
  use: { baseURL: 'http://localhost:5173',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      args: ['--no-sandbox','--disable-dev-shm-usage', ...(process.env.PLAYWRIGHT_CHROMIUM_ARGS ? JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS) : [])],
    } : {},
  },
  // Las pruebas interceptan esta URL; nunca reutilizan credenciales de .env.local.
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1', url: 'http://localhost:5173', reuseExistingServer: false,
    env: {
      VITE_INSFORGE_URL: 'https://mpy5z5dn.us-east.insforge.app',
      VITE_INSFORGE_ANON_KEY: 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.browser-test',
    },
  },
});
