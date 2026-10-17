import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  base: "./",
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    target: "es2020",
    lib: {
      entry: resolve(__dirname, "src/main/index.tsx"),
      formats: ["cjs"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: ["premierepro", "uxp", "os"],
      output: {
        format: "cjs",
        exports: "named",
        interop: "auto",
      },
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/premiere/**/*.ts"],
      reporter: ["text", "text-summary"],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
