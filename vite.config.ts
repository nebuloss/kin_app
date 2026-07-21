import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// No dev proxy: the app is 100% client-side (state lives in cookies), so `vite`
// alone serves it in development. In production the Express server (server.ts)
// serves the built SPA — see README / docs/deployment.md.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
})
