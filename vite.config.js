import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use './' for relative paths that work everywhere
// Change to '/milk-trivia/' only if deploying to github.io/milk-trivia/
export default defineConfig({
  plugins: [react()],
  base: './',
})
