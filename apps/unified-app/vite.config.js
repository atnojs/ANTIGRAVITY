import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/apps/generar_editar/', // Vital para despliegue en subcarpetas de Hostinger
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Generar nombres de archivos limpios para facilitar el mantenimiento en el hosting
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
