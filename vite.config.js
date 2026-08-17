import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base must match the GitHub Pages repo name: https://<user>.github.io/trade-logger/
export default defineConfig({
  plugins: [react()],
  base: '/trade-logger/',
})
