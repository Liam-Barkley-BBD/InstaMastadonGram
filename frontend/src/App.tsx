import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Home, Search, Plus, User, Globe } from 'lucide-react';
import HomePage from "./pages/HomePage";
import Login from './pages/LoginPage';
import ProfilePage from "./pages/ProfilePage";
import SearchUsersPage from "./pages/SearchUsers";
import UploadMediaPage from "./pages/Uploadpage";
// import ExplorePage from "./pages/ExplorePage";
import './App.css';
import useAuth from "./services/user.service";
import { FedifyHandler } from "./fedify/fedify";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const fedify = new FedifyHandler()
  const { user, authLoading } = useAuth();

  const sidebarItems = [
    { id: 'home', icon: Home, label: 'Home', path: '/' },
    { id: 'explore', icon: Globe, label: 'Explore', path: '/explore' },
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

  if (authLoading) return <div>Loading...</div>;

  return user?.handle 
  ? (
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
            <article>
              <h2 className="beegram-username">{fedify.extractUsername(user?.handle)}</h2>
              <p className="beegram-handle">{user?.handle}</p>
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
            <Route path="/me" element={<ProfilePage handle = {fedify.extractUsername(user?.handle)} isProfileTab = {true}/>} />
            {/* <Route path="/explore" element={<ExplorePage domain = {fedify.extractDomain(user?.handle)} />} /> */}
            <Route path="/search" element={<SearchUsersPage />} />
            <Route path="/create" element={<UploadMediaPage />} />
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
  )
  : (
      <div className="login-wrapper">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
}

export default App;
