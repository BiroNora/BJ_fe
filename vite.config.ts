import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // A 'proxy' objektum kezeli az átirányításokat
    proxy: {
      '/api': { // Ha a frontend egy URL-t kér, ami '/api'-val kezdődik (pl. /api/initialize_session)
        target: 'http://localhost:8080', // <-- Ide mutasson: a SpringBoot backend címe és portja
        changeOrigin: true, // Fontos: módosítja a kérés 'Host' fejlécét a cél URL-re (szükséges lehet a backend számára)
        secure: false,
      },
    },
    port: 5173,
  },
})
