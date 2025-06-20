import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0', // Allow external connections
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'myshaad.com',
      'www.myshaad.com'
    ],
    fs: {
      allow: ['..', '.']  // Allow access to parent directory for .env
    },
    proxy: {
      // Proxy API requests to backend during development
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
