import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Home, Search, Plus, User } from 'lucide-react';
import UploadMediaPage from './pages/Uploadpage';
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import SearchUsersPage from './pages/SearchUsers';
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

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="beegram-sidebar">
        {/* Logo */}
        <header className="beegram-logo">
          <p>IMDG</p>
        </header>

        {/* Navigation */}
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

        {/* User Profile */}
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
        {/* Mobile Header */}
        <header className="beegram-mobile-header">
          <h1 className="beegram-mobile-logo">IMDG</h1>
        </header>

        <div className="main-content-inner">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/me" element={<ProfilePage />} />
            <Route path="/search" element={<SearchUsersPage/>} />
            <Route path="/create" element={<UploadMediaPage/>} />
          </Routes>
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
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