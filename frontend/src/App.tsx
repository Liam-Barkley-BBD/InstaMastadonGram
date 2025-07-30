import { Routes, Route } from "react-router-dom"
import HomePage from "./pages/HomePage"

function App() {
  return (
    <div className="app-container">
      {/* Main Content */}
      <main className="main-content">
        <div className="main-content-inner">
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
