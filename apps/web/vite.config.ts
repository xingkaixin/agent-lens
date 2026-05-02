import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Read version from package.json
const pkg = await import("./package.json", { with: { type: "json" } });

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "react";
          }
          if (id.includes("/react-syntax-highlighter/") || id.includes("/refractor/")) {
            return "syntax";
          }
          if (id.includes("/react-markdown/") || id.includes("/remark-") || id.includes("/mdast-")) {
            return "markdown";
          }
          return "vendor";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.default.version),
  },
});
