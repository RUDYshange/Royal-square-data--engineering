import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Built files land in dist/ as plain static assets.
// FastAPI serves them — no Node process at runtime.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // During `npm run dev` only: forward API calls to FastAPI
    // so the browser sees one origin and CORS never comes up.
    proxy: {
      '/health':    'http://localhost:8000',
      '/realtime':  'http://localhost:8000',
      '/analytics': 'http://localhost:8000',
      '/users':     'http://localhost:8000',
      '/clients':   'http://localhost:8000',
      '/auth':      'http://localhost:8000',
    },
  },
})
