
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    // ⬇️ Option A: raise/disable the chunk size warning (in kB)
    build: {
      chunkSizeWarningLimit: 1500, // adjust as you prefer (e.g., 1000–2000)

      // Optional niceties (safe to keep or remove)
      sourcemap: false,            // reduce build artifacts
      cssMinify: true,             // ensure CSS minification
      // You can also set target if you want consistent output:
      // target: 'es2018',
    },
  };
});
