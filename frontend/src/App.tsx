import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Analyze from './pages/Analyze';
import { ShieldCheck } from 'lucide-react';

function App() {
  return (
    <BrowserRouter>
      {/* Abstract technical atmosphere */}
      <div className="atmospheric-bg"></div>
      <div className="atmospheric-grid"></div>

      <div className="container">
        <header className="navbar">
          <Link to="/" className="logo">
            <ShieldCheck size={24} color="var(--accent-primary)" />
            Valgent
          </Link>
          <nav className="navbar-links">
            <Link to="/analyze" className="glass-btn">Analyze Project</Link>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/analyze" element={<Analyze />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
