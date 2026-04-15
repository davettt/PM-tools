import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CodeReview from './pages/CodeReview'
import PRD from './pages/PRD'

function App() {
  const [buildStale, setBuildStale] = useState(false)

  useEffect(() => {
    void fetch('/api/build-status')
      .then((r) => r.json())
      .then((d) => setBuildStale(d.stale === true))
      .catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      {buildStale && (
        <div className="border-b border-amber-300 bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
          Source files have changed since the last build. Run{' '}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
            npm run restart:pm2
          </code>{' '}
          to apply updates.
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/code-review/:id" element={<CodeReview />} />
        <Route path="/prd/:id" element={<PRD />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
