import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5200,
    host: '0.0.0.0',
    allowedHosts: ['wit.just-bake.it'],
    proxy: {
      '/api': {
        target: 'http://49.12.195.247:5210',
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              res.socket?.setNoDelay(true);
            }
          });
        },
      },
      '/socket.io': {
        target: 'http://49.12.195.247:5210',
        ws: true,
      },
    },
  },
})
