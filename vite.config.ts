/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base keeps the build deployable on GitHub Pages project sites.
  base: './',
  build: { target: 'es2022', sourcemap: true },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    // tokens.css is read raw by the contrast test; other CSS stays stubbed.
    css: { include: [/tokens\.css/] },
  },
});
