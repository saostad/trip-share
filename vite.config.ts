import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const buildTime = new Date().toISOString()
const buildCommit = (process.env.GITHUB_SHA || process.env.VITE_BUILD_COMMIT || 'local').slice(0, 7)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
    __BUILD_COMMIT__: JSON.stringify(buildCommit),
  },
})
