import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss(),
  ],
  // The backend does not allow localhost origins yet, so proxy API calls in dev.
  server: {
    proxy: {
      '/api': {
        target: 'https://cms-backend-nw6j.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
