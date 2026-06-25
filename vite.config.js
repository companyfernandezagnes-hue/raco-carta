import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Solo separar lo crítico
          if (id.includes('react')) return 'react-vendor'
          if (id.includes('supabase')) return 'supabase'
          if (id.includes('qrcode')) return 'qrcode'
          // imgly se carga dinámicamente, dejamos que Vite lo resuelva
        }
      }
    },
    chunkSizeWarningLimit: 600,
  },
})
