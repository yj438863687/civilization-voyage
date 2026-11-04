import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '.', 'VOYAGE_');
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1', port: 5173, strictPort: true,
      proxy: {
        '/api': {
          target: environment.VOYAGE_API_PROXY_TARGET ?? 'http://127.0.0.1:8010',
          rewrite: path => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
