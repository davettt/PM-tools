import express from 'express'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'local_data')
const REVIEWS_FILE = join(DATA_DIR, 'reviews.json')
const PRDS_FILE = join(DATA_DIR, 'prds.json')

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

async function readPrds() {
  await ensureDataDir()
  if (!existsSync(PRDS_FILE)) {
    await writeFile(PRDS_FILE, '[]', 'utf-8')
    return []
  }
  const raw = await readFile(PRDS_FILE, 'utf-8')
  return JSON.parse(raw)
}

async function writePrds(prds) {
  await ensureDataDir()
  await writeFile(PRDS_FILE, JSON.stringify(prds, null, 2), 'utf-8')
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function purgeExpiredDeletes(docs) {
  const cutoff = Date.now() - SEVEN_DAYS_MS
  return docs.filter(d => !d.deletedAt || new Date(d.deletedAt).getTime() > cutoff)
}

export function createApp() {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  const router = express.Router()

  router.get('/api/health', (_req, res) => res.json({ ok: true }))

  router.post('/api/ai', async (req, res) => {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return res
        .status(503)
        .json({ error: 'ANTHROPIC_API_KEY not set. Add it to your .env file.' })
    }
    try {
      const { prompt, systemPrompt } = req.body
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        return res
          .status(response.status)
          .json({ error: err.error?.message ?? 'Anthropic API error' })
      }
      res.json(await response.json())
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'AI request failed' })
    }
  })

  router.get('/api/reviews', async (_req, res) => {
    try {
      const raw = await readReviews()
      const purged = purgeExpiredDeletes(raw)
      if (purged.length !== raw.length) await writeReviews(purged)
      res.json(purged)
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

  router.patch('/api/reviews/:id/soft-delete', async (req, res) => {
    try {
      const reviews = await readReviews()
      const idx = reviews.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Not found' })
      reviews[idx].deletedAt = new Date().toISOString()
      await writeReviews(reviews)
      res.json(reviews[idx])
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to delete review' })
    }
  })

  router.patch('/api/reviews/:id/restore', async (req, res) => {
    try {
      const reviews = await readReviews()
      const idx = reviews.findIndex(r => r.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Not found' })
      delete reviews[idx].deletedAt
      await writeReviews(reviews)
      res.json(reviews[idx])
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to restore review' })
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

  router.get('/api/prds', async (_req, res) => {
    try {
      const raw = await readPrds()
      const purged = purgeExpiredDeletes(raw)
      if (purged.length !== raw.length) await writePrds(purged)
      res.json(purged)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to read PRDs' })
    }
  })

  router.get('/api/prds/:id', async (req, res) => {
    try {
      const prds = await readPrds()
      const prd = prds.find(p => p.id === req.params.id)
      if (!prd) return res.status(404).json({ error: 'Not found' })
      res.json(prd)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to get PRD' })
    }
  })

  router.post('/api/prds', async (req, res) => {
    try {
      const prds = await readPrds()
      prds.push(req.body)
      await writePrds(prds)
      res.status(201).json(req.body)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to create PRD' })
    }
  })

  router.put('/api/prds/:id', async (req, res) => {
    try {
      const prds = await readPrds()
      const idx = prds.findIndex(p => p.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Not found' })
      prds[idx] = req.body
      await writePrds(prds)
      res.json(req.body)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to update PRD' })
    }
  })

  router.patch('/api/prds/:id/soft-delete', async (req, res) => {
    try {
      const prds = await readPrds()
      const idx = prds.findIndex(p => p.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Not found' })
      prds[idx].deletedAt = new Date().toISOString()
      await writePrds(prds)
      res.json(prds[idx])
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to delete PRD' })
    }
  })

  router.patch('/api/prds/:id/restore', async (req, res) => {
    try {
      const prds = await readPrds()
      const idx = prds.findIndex(p => p.id === req.params.id)
      if (idx === -1) return res.status(404).json({ error: 'Not found' })
      delete prds[idx].deletedAt
      await writePrds(prds)
      res.json(prds[idx])
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to restore PRD' })
    }
  })

  router.delete('/api/prds/:id', async (req, res) => {
    try {
      const prds = await readPrds()
      const filtered = prds.filter(p => p.id !== req.params.id)
      if (filtered.length === prds.length) {
        return res.status(404).json({ error: 'Not found' })
      }
      await writePrds(filtered)
      res.status(204).send()
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to delete PRD' })
    }
  })

  function importDocs(incoming, existing) {
    const byId = new Map(existing.map(d => [d.id, d]))
    let added = 0
    let updated = 0
    let skipped = 0
    for (const doc of incoming) {
      if (!doc.id || typeof doc.id !== 'string' || !doc.modifiedAt || typeof doc.modifiedAt !== 'string') {
        skipped++
        continue
      }
      const current = byId.get(doc.id)
      if (!current) {
        byId.set(doc.id, doc)
        added++
      } else if (doc.modifiedAt > current.modifiedAt) {
        byId.set(doc.id, doc)
        updated++
      }
    }
    return { merged: [...byId.values()], added, updated, unchanged: incoming.length - added - updated - skipped, skipped }
  }

  router.post('/api/reviews/import', async (req, res) => {
    try {
      const incoming = req.body
      if (!Array.isArray(incoming)) {
        return res.status(400).json({ error: 'Expected an array of documents' })
      }
      const existing = await readReviews()
      const { merged, added, updated, unchanged, skipped } = importDocs(incoming, existing)
      await writeReviews(merged)
      res.json({ added, updated, unchanged, skipped })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to import reviews' })
    }
  })

  router.post('/api/prds/import', async (req, res) => {
    try {
      const incoming = req.body
      if (!Array.isArray(incoming)) {
        return res.status(400).json({ error: 'Expected an array of documents' })
      }
      const existing = await readPrds()
      const { merged, added, updated, unchanged, skipped } = importDocs(incoming, existing)
      await writePrds(merged)
      res.json({ added, updated, unchanged, skipped })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to import PRDs' })
    }
  })

  app.use(router)
  return app
}
