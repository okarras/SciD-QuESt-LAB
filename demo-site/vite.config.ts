import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  envDir: __dirname,
  envPrefix: ['VITE_', 'OPENROUTER_'],
  plugins: [react()],
  optimizeDeps: {
    include: ['react-pdf', 'pdfjs-dist', 'react-redux', '@reduxjs/toolkit'],
  },
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@emotion/react': path.resolve(__dirname, 'node_modules/@emotion/react'),
      '@emotion/styled': path.resolve(__dirname, 'node_modules/@emotion/styled'),
      '@mui/material': path.resolve(__dirname, 'node_modules/@mui/material'),
    },
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled', '@mui/material'],
  },
})
