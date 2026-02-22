import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CodeReview from './pages/CodeReview'
import PRD from './pages/PRD'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/code-review/:id" element={<CodeReview />} />
        <Route path="/prd/:id" element={<PRD />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
