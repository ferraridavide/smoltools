import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/image-swiper/",
  build: {
    outDir: '../dist/image-swiper',
    emptyOutDir: true
  }
})
