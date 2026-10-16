import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import path from "path";

export default defineConfig({
  plugins: [
    nitro({ preset: "vercel" }),
    tanstackStart({
      server: { entry: "server" },
      routers: {
        server: {
          entry: "server",
        },
      },
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  server: {
    watch: {
      ignored: [
        path.resolve(__dirname, "public/music/**"),
        path.resolve(__dirname, "public/cover/**"),
      ],
    },
  },
});
