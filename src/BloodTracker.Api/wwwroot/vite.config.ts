import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'js/main.ts'),
      output: {
        entryFileNames: 'js/main.js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: (assetInfo) => {
          // CSS bundle → dist/css/style.css
          if (assetInfo.name?.endsWith('.css')) return 'css/style.css'
          return 'assets/[name][extname]'
        },
      },
    },
  },
})
