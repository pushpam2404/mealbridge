import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Match the API's PORT so the dev proxy still works when 5050 is taken.
    proxy: { '/api': `http://localhost:${process.env.PORT ?? 5050}` },
  },
});
