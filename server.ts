/**
 * Production server — serves the Vite-built SPA and falls back to index.html for
 * client-side routing. That's all it does: the app has no backend logic and no
 * database (every bit of state lives in cookies on the user's device).
 *
 * In development you don't need this at all — `npm run dev` (vite) serves the SPA
 * with HMR. In production, `npm run build` compiles this file to dist-server/ and
 * bundles the SPA to dist/, then `npm start` runs it on PORT (default 3000).
 */

import express from 'express'
import path from 'path'

const app = express()
app.set('trust proxy', 1)
const PORT = Number(process.env.PORT ?? 3000)

// Serve the built SPA. __dirname is dist-server/ at runtime, so ../dist.
const distDir = path.join(__dirname, '..', 'dist')
app.use(express.static(distDir))

// SPA fallback: any unmatched route returns index.html.
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Kin app running on port ${PORT}`)
})
