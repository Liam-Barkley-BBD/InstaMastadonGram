import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Home, Search, Plus, User } from 'lucide-react';
import HomePage from "./pages/HomePage";
import Login from './pages/LoginPage';
import ProfilePage from "./pages/ProfilePage";
import SearchUsersPage from "./pages/SearchUsers";
import UploadMediaPage from "./pages/Uploadpage";
import './App.css';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const sidebarItems = [
    { id: 'home', icon: Home, label: 'Home', path: '/' },
    { id: 'search', icon: Search, label: 'Search', path: '/search' },
    { id: 'create', icon: Plus, label: 'Create', path: '/create' },
    { id: 'profile', icon: User, label: 'Profile', path: '/me' }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return (
      <div className="login-wrapper">
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="beegram-sidebar">
        <header className="beegram-logo">
          <p>IMDG</p>
        </header>

        <nav className="beegram-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`beegram-nav-btn ${isActive(item.path) ? 'active' : ''}`}
            >
              <item.icon size={24} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <footer className="beegram-profile">
          <section className="beegram-profile-card">
            <span className="beegram-avatar">DB</span>
            <article>
              <h2 className="beegram-username">Darlene Beats</h2>
              <p className="beegram-handle">@darlene_beats</p>
            </article>
          </section>
        </footer>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="beegram-mobile-header">
          <h1 className="beegram-mobile-logo">IMDG</h1>
        </header>

        <div className="main-content-inner">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/me" element={<ProfilePage />} />
            <Route path="/search" element={<SearchUsersPage />} />
            <Route path="/create" element={<UploadMediaPage />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="beegram-mobile-nav">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
            className={`beegram-mobile-nav-btn ${isActive(item.path) ? 'active' : ''}`}
          >
            <item.icon size={24} />
            <span className="beegram-mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
