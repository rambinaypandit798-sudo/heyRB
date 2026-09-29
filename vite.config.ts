import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouterVite } from '@tanstack/router-plugin/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  base: './', // Crucial: forces relative paths so Android WebView doesn't white-screen
  plugins: [
    tanstackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
    tsconfigPaths(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 8080,
    host: true,
  },
});
