import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxies /api/* to the Express backend (server/app.js) on :3000,
// so the browser only ever talks to your own server, never Vocal Bridge directly.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
