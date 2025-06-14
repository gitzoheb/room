import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // During development the frontend runs on a different origin (e.g. :5173)
  // which means browser requests to "/api/*" or "/uploads/*" would otherwise
  // target the Vite dev server itself and fail. The proxy makes sure those
  // requests are transparently forwarded to the backend Express server.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
