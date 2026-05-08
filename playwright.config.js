import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'http://127.0.0.1:8080',
  },
  webServer: {
    command: 'npx http-server ./ -p 8080 --cors',
    url: 'http://127.0.0.1:8080',
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

