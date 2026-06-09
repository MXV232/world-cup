import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://<user>.github.io/world-cup/ in production, root in dev.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/world-cup/' : '/',
  plugins: [react()],
}));
