/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { ocrAssets } from './build/ocr-assets.mjs';

export default defineConfig({
  // Relative base keeps the build deployable on GitHub Pages project sites.
  base: './',
  // Serves the Image to Text engine and language files from this site (see build/ocr-assets.mjs).
  plugins: [ocrAssets()],
  build: { target: 'es2022', sourcemap: true },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    // tokens.css is read raw by the contrast test; other CSS stays stubbed.
    css: { include: [/tokens\.css/] },
  },
});
