import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CodeReview from './pages/CodeReview'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/code-review/:id" element={<CodeReview />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
