import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Make Vite read .env files from the client directory
  envDir: __dirname,
  // Use VITE_ prefix for all environment variables (Vite default)
  // envPrefix: 'VITE_', // Default, can be omitted
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        // configure: (proxy, _options) => {
        //   proxy.on('proxyReq', (proxyReq, req, _res) => {
        //     // Forward the X-PAYMENT header
        //     if (req.headers['x-payment']) {
        //       proxyReq.setHeader('X-PAYMENT', req.headers['x-payment']);
        //     }
        //   });
        // },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
