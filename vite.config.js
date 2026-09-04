import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Target can be local or remote LTS
  const proxyTarget = env.VITE_PROXY_TARGET || (mode === 'lts' ? 'https://lts.academyfactory.online' : 'http://localhost:8000');

  return {
    base: mode === 'production' ? '/adminer/' : mode === 'moodle' ? '/local/adminer_ui/app/' : '/',
    build: {
      outDir: mode === 'moodle' ? 'plugin/local_adminer_ui/app' : 'dist',
      emptyOutDir: true,
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/__tests__/setup.js',
    },
    server: {
      port: 3001,
      host: true,
      proxy: {
        '^/moodle(/|$)': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/moodle/, '') || '/'
        }
      }
    }
  };
});
