import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const localScidQuestRoot = path.resolve(__dirname, '../../ScidQuest')
const localScidQuestEntry = path.resolve(localScidQuestRoot, 'src/lib/index.ts')
const useLocalScidQuest = fs.existsSync(localScidQuestEntry)
const npmScidQuestDist = path.resolve(__dirname, 'node_modules/@orkg/scidquest/dist')
const localScidQuestDist = path.resolve(localScidQuestRoot, 'dist')
const scidQuestCssDist = fs.existsSync(path.join(localScidQuestDist, 'contribute-standalone.css'))
  ? localScidQuestDist
  : npmScidQuestDist

// https://vite.dev/config/
export default defineConfig({
  envDir: __dirname,
  envPrefix: ['VITE_', 'OPENROUTER_'],
  plugins: [react()],
  optimizeDeps: {
    include: ['react-pdf', 'pdfjs-dist', 'react-redux', '@reduxjs/toolkit'],
  },
  server: {
    fs: {
      allow: [
        path.resolve(__dirname),
        ...(useLocalScidQuest ? [localScidQuestRoot] : []),
      ],
    },
  },
  resolve: {
    alias: {
      // Keep CSS on the built package/dist — the source alias only covers JS.
      '@orkg/scidquest/dist/contribute-standalone.css': path.join(
        scidQuestCssDist,
        'contribute-standalone.css',
      ),
      '@orkg/scidquest/dist/scidquest.css': path.join(scidQuestCssDist, 'scidquest.css'),
      ...(useLocalScidQuest ? { '@orkg/scidquest': localScidQuestEntry } : {}),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@emotion/react': path.resolve(__dirname, 'node_modules/@emotion/react'),
      '@emotion/styled': path.resolve(__dirname, 'node_modules/@emotion/styled'),
      '@mui/material': path.resolve(__dirname, 'node_modules/@mui/material'),
    },
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled', '@mui/material'],
  },
})
