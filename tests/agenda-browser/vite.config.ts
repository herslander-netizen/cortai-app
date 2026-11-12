import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  root: "tests/agenda-browser",
  plugins: [tsconfigPaths(), react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
});
