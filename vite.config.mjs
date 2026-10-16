import { defineConfig } from 'vite';

// Local preview and Sites use /. GitHub Actions supplies /<repository>/.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
});
