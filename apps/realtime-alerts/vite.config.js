import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [],
  build: {
    target: 'es2019',
    sourcemap: false,
    cssCodeSplit: true,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
})