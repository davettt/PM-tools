import express from 'express'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'local_data')
const REVIEWS_FILE = join(DATA_DIR, 'reviews.json')

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

async function readReviews() {
  await ensureDataDir()
  if (!existsSync(REVIEWS_FILE)) {
    await writeFile(REVIEWS_FILE, '[]', 'utf-8')
    return []
  }
  const raw = await readFile(REVIEWS_FILE, 'utf-8')
  return JSON.parse(raw)
}

async function writeReviews(reviews) {
  await ensureDataDir()
  await writeFile(REVIEWS_FILE, JSON.stringify(reviews, null, 2), 'utf-8')
}

export function createApp() {
  const app = express()
  app.use(express.json())
  const router = express.Router()

  router.get('/api/health', (_req, res) => res.json({ ok: true }))

  router.get('/api/reviews', async (_req, res) => {
    try {
      res.json(await readReviews())
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to read reviews' })
    }
  })

  router.get('/api/reviews/:id', async (req, res) => {
    try {
      const reviews = await readReviews()
      const review = reviews.find(r => r.id === req.params.id)
      if (!review) return res.status(404).json({ error: 'Not found' })
      res.json(review)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to get review' })
    }
  })

  router.post('/api/reviews', async (req, res) => {
    try {
      const reviews = await readReviews()
      reviews.push(req.body)
      await writeReviews(reviews)
      res.status(201).json(req.body)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to create review' })
    }
  })

  router.put('/api/reviews/:id', async (req, res) => {
    try {
      const reviews = await readReviews()
      const idx = reviews.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Not found' })
      reviews[idx] = req.body
      await writeReviews(reviews)
      res.json(req.body)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to update review' })
    }
  })

  router.delete('/api/reviews/:id', async (req, res) => {
    try {
      const reviews = await readReviews()
      const filtered = reviews.filter(r => r.id !== req.params.id)
      if (filtered.length === reviews.length) {
        return res.status(404).json({ error: 'Not found' })
      }
      await writeReviews(filtered)
      res.status(204).send()
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to delete review' })
    }
  })

  app.use(router)
  return app
}
