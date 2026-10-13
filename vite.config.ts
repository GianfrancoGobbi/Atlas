import path from 'path';
import { defineConfig } from 'vite';

// Solo las variables con prefijo VITE_ llegan al navegador (import.meta.env).
// Los secretos (como GEMINI_API_KEY) no se inyectan acá: los lee la Netlify Function.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
