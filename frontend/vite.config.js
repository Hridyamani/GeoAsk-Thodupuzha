import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'] // <--- THIS IS THE FIX
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'] // <--- FORCES ONE BATCH
  }
})