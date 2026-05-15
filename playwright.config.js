import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'http://localhost:8080',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  webServer: {
    command: 'npx http-server ./ -p 8080 --cors',
    url: 'http://localhost:8080',
  },
});
