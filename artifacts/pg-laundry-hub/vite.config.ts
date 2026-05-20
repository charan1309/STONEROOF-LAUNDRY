import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 🎯 THIS FIXES THE BLANK SCREEN PATH ISSUE FOR GITHUB PAGES SUBFOLDERS
  base: '/STONEROOF-LAUNDRY/'
});
