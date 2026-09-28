import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // यह मोबाइल/Capacitor के लिए बहुत जरूरी है ताकि पाथ मिस न हो
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
