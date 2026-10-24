import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor-react";
          }
          if (id.includes("/src/generated/")) {
            return "hms-graphql-schema";
          }
          if (id.includes("/src/lib/") || id.includes("/src/components/")) {
            return "hms-common";
          }
          if (id.includes("/src/qr/")) {
            return "route-guest-qr";
          }
          if (id.includes("/src/staff/")) {
            return "route-staff-pwa";
          }
          if (id.includes("/src/admin/")) {
            return "route-admin-pms";
          }
        },
      },
    },
  },
});
