import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  base: "/power-renamer/",
  build: {
    outDir: '../dist/power-renamer',
    emptyOutDir: true
  }
})
