import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsConfigPaths(), viteReact(), tailwindcss()],
  test: {
    clearMocks: true,
    restoreMocks: true,
  },
});
