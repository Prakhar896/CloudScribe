import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  build: {
    rollupOptions: {
        input: {
            index: 'index.html',
        },
        output: {
            entryFileNames: '[name].js',
            assetFileNames: 'assets/[name].[ext]',
            chunkFileNames: '[name].js',
        }
    },
    outDir: 'dist'
  }
})
