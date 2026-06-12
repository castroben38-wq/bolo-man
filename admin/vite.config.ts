import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  // Railway serves the production build via `vite preview`; allow its dynamic
  // *.up.railway.app domain (and any custom domain) through the host check.
  preview: { port: 4173, host: true, allowedHosts: true },
});
