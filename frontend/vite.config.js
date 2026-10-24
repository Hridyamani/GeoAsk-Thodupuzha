
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },

  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,

    // Allow only this current Cloudflare Quick Tunnel hostname.
    allowedHosts: [
  '   plates-references-mere-fusion.trycloudflare.com',
    ],

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
