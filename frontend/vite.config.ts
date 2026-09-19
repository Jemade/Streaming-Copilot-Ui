/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:8008',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8008',
        changeOrigin: true,
      },
      '/metrics': {
        target: 'http://127.0.0.1:8008',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
});
