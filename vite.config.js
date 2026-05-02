import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VERCEL ? '/' : '/raco-carta/',
  build: {
    // Separar las dependencias pesadas en chunks propios para que la primera
    // carga del cliente sea rápida y se cacheen mejor entre versiones.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':  ['react', 'react-dom'],
          'supabase':      ['@supabase/supabase-js'],
          'qrcode':        ['qrcode'],
          // background-removal ya es lazy import dinámico, va en su propio chunk
        }
      }
    },
    chunkSizeWarningLimit: 600,
  },
})
