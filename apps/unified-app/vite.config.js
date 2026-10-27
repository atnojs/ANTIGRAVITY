import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ---------------------------------------------------------------------------
// Unified Studio (apps/unified-app)
// - base: la app se publica en https://atnojs.es/apps/unified-app/
// - la entrada de Vite es index.dev.html; index.html es la página de PRODUCCIÓN
//   (la genera scripts/publish.mjs apuntando a assets/app.<fecha>.js|css).
//   No edites index.html a mano: ejecuta `npm run publish:app`.
// ---------------------------------------------------------------------------
export default defineConfig({
  plugins: [react()],
  base: '/apps/unified-app/',
  server: {
    open: '/index.dev.html',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: 'index.dev.html',
      output: {
        manualChunks: undefined,
      },
    },
  },
})
