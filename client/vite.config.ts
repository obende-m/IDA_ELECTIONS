import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        // Vendor chunking. Route splitting (voter flow vs. admin pages) is done with dynamic imports in src/router.tsx.
        manualChunks(id) {
          const normalized = id.split('\\').join('/')
          if (normalized.includes('/node_modules/')) {
            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(normalized)) return 'react-vendor'
            if (/\/node_modules\/(react-router|react-router-dom|@remix-run)\//.test(normalized)) return 'router-vendor'
            if (/\/node_modules\/@tanstack\//.test(normalized)) return 'query-vendor'
            // Only admin forms use these, so they stay out of the voter path.
            if (/\/node_modules\/(react-hook-form|@hookform|zod)\//.test(normalized)) return 'forms-vendor'
            return undefined
          }
          return undefined
        },
      },
    },
  },
})
