import React, { useState } from 'react';
import { Home, Search, Plus, User, Image, MessageCircle} from 'lucide-react';
import './HomePage.css';

interface Post {
  id: string;
  username: string;
  timestamp: string;
  avatar: string;
  isFollowing: boolean;
  hasImage: boolean;
  description: string;
}

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [posts] = useState<Post[]>([
    {
      id: '1',
      username: 'nilesh',
      timestamp: '2h ago',
      avatar: '/api/placeholder/40/40',
      isFollowing: true,
      hasImage: false,
      description: "Discover adventure in Patagonia's peaks or serenity in Provence's lavender fields - every journey teaches us something new about ourselves and the world around us. The mountains call and I must go! ⛰️✨"
    },
    {
      id: '2',
      username: 'sarah_explorer',
      timestamp: '4h ago',
      avatar: '/api/placeholder/40/40',
      isFollowing: false,
      hasImage: true,
      description: "Golden hour at the beach never gets old. Sometimes the best moments are the quiet ones where you can just breathe and appreciate the beauty around us. 🌅🌊"
    },
    {
      id: '3',
      username: 'alex_wanderer',
      timestamp: '6h ago',
      avatar: '/api/placeholder/40/40',
      isFollowing: true,
      hasImage: false,
      description: "Coffee tastes better when you're watching the sunrise from a mountain peak. Early mornings are tough but the views are always worth it! ☕🏔️"
    }
  ]);

  const sidebarItems = [
    { id: 'home', icon: Home, label: 'Home', active: true },
    { id: 'search', icon: Search, label: 'Search', active: false },
    { id: 'create', icon: Plus, label: 'Create', active: false },
    { id: 'profile', icon: User, label: 'Profile', active: false }
  ];

  return (
    <main className="beegram-container">
      {/* Sidebar */}
      <aside className="beegram-sidebar">
        {/* Logo */}
        <header className="beegram-logo">
        <p>
          IMDG
        </p>
        </header>

        {/* Navigation */}
        <nav className="beegram-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`beegram-nav-btn ${item.id === activeTab ? 'active' : ''}`}
            >
              <item.icon size={24} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <footer className="beegram-profile">
          <section className="beegram-profile-card">
            <span className="beegram-avatar">
              DB
            </span>
            <article>
              <h2 className="beegram-username">Darlene Beats</h2>
              <p className="beegram-handle">@darlene_beats</p>
            </article>
          </section>
        </footer>
      </aside>

      {/* Main Content */}
      <section className="beegram-main">
        {/* Mobile Header */}
        <header className="beegram-mobile-header">
          <h1 className="beegram-mobile-logo">
            IMDG
        </h1>
        </header>

        {/* Main Feed */}
        <main className="beegram-feed">
          {posts.map((post) => (
            <article key={post.id} className="beegram-post">
              {/* Post Header */}
              <header className="beegram-post-header">
                <section className="beegram-post-user">
                  <span className="beegram-post-avatar"></span>
                  <article>
                    <h3 className="beegram-username">{post.username}</h3>
                    <time className="beegram-timestamp">{post.timestamp}</time>
                  </article>
                </section>
                {post.isFollowing && (
                  <button className="beegram-follow-btn">
                    Following
                  </button>
                )}
              </header>

              {/* Post Content */}
              <section className="beegram-post-content">
                {post.hasImage ? (
                  <div className="beegram-post-image">
                    <img src="/api/placeholder/400/300" alt="Post content" />
                  </div>
                ) : (
                  <article className="beegram-empty-content">
                    <Image size={64} className="beegram-empty-icon" />
                    <p className="beegram-empty-title">No image content</p>
                    <p className="beegram-empty-subtitle">Share your moments with the world</p>
                  </article>
                )}
              </section>

              {/* Post Actions */}
              <footer className="beegram-post-actions">
                <section className="beegram-action-group">
                  <button className="beegram-action-btn comment">
                    <MessageCircle size={24} />
                  </button>
                </section>
              </footer>

              {/* Post Stats and Description */}
              <section className="beegram-post-stats">
               
                <div className="beegram-post-description">
                  <span className="beegram-username">{post.username}</span>
                  <span className="beegram-description-text">{post.description}</span>
                </div>

                <time className="beegram-post-time">{post.timestamp}</time>
              </section>
            </article>
          ))}

          {/* Empty State */}
          {posts.length === 0 && (
            <section className="beegram-empty-state">
              <span className="beegram-empty-emoji">🐝</span>
              <h2 className="beegram-empty-heading">
                Welcome to the Hive!
              </h2>
              <p className="beegram-empty-text">
                Start following people to see their buzz-worthy posts
              </p>
              <button className="beegram-discover-btn">
                Discover People
              </button>
            </section>
          )}
        </main>
      </section>

      {/* Bottom Navigation (Mobile) */}
      <nav className="beegram-mobile-nav">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`beegram-mobile-nav-btn ${item.id === activeTab ? 'active' : ''}`}
          >
            <item.icon size={24} />
            <span className="beegram-mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
};

export default HomePage;