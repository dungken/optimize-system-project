import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // Gọi /api/... từ :5173 sẽ được chuyển sang backend :8080 → không vướng CORS
    proxy: { '/api': 'http://localhost:8080' },
  },
})
