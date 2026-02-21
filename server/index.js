import { config } from 'dotenv'
config()
import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createApp } from './router.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT ?? 3004

const app = express()

// API routes
app.use(createApp())

// Serve built frontend
const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// SPA fallback
app.get('/{*path}', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`PM Tools running on http://localhost:${PORT}`)
})
