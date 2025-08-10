import React, { useEffect, useState } from 'react';
import {  MessageCircle } from 'lucide-react';
import './styles/HomePage.css';
import { FedifyHandler } from '../fedify/fedify';
import useAuth from '../services/user.service';

const HomePage: React.FC = () => {
  const fedifyHandler = new FedifyHandler();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const auth = useAuth();

  useEffect(() => {
    const fetchOptimizedFeed = async () => {
      try {
        setIsLoading(true);
        const optimizedFeed = await fedifyHandler.getFollowingPosts(
          undefined,
          `${auth.user?.url}/follows`,
          60, // limit
          25, // maxFollowingToFetch
          2 // postsPerUser
        );
        setPosts(optimizedFeed.items);
      } catch (err) {
        console.error('Failed to fetch optimized posts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if we have auth data
    if (auth?.user?.handle) {
      fetchOptimizedFeed();
    }
  }, [auth?.user?.handle]); // Add dependency on auth data

  // Helper function to format timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <section className="beegram-feed">
      {isLoading ? (
        <div className="beegram-loader-container">
          <div className="beegram-loader"></div>
          <p>Loading buzzworthy posts...</p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <article key={post.id} className="beegram-post">
              {/* Post Header */}
              <header className="beegram-post-header">
                <section className="beegram-post-user">
                  <span className="beegram-post-avatar"></span>
                  <article>
                    <h3 className="beegram-username">{post.sourceDisplayName}</h3>
                    <time className="beegram-timestamp">{formatTimestamp(post.publishedDate)}</time>
                  </article>
                </section>
                <button className="beegram-follow-btn">Following</button>
              </header>

              {/* Post Content */}
              <section className="beegram-post-content">
                {post.imagecontent?.length > 0 && (
                  <img
                    src={post.imagecontent[0].url}
                    alt={post.imagecontent[0].name}
                    className="beegram-post-image"
                    style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }}
                  />
                )}
              </section>

              {/* Post Actions */}
              <footer className="beegram-post-actions">
                <section className="beegram-action-group">
                  <button className="beegram-action-btn comment">
                    <MessageCircle size={24} />
                    <span>{post.replies}</span>
                  </button>
                  <button className="beegram-action-btn share">
                    <span>↻</span>
                    <span>{post.shares}</span>
                  </button>
                  <button className="beegram-action-btn like">
                    <span>♥</span>
                    <span>{post.likes}</span>
                  </button>
                </section>
              </footer>

              {/* Post Stats and Description */}
              <section className="beegram-post-stats">
                <div className="beegram-post-description">
                  <span className="beegram-username">{post.sourceUser}</span>
                  <span className="beegram-description-text">{post.textcontent}</span>
                </div>
                <time className="beegram-post-time">{formatTimestamp(post.publishedDate)}</time>
              </section>
            </article>
          ))}

          {/* Empty State */}
          {posts.length === 0 && !isLoading && (
            <section className="beegram-empty-state">
              <span className="beegram-empty-emoji">🐝</span>
              <h2 className="beegram-empty-heading">Welcome to the Hive!</h2>
              <p className="beegram-empty-text">
                Start following people to see their buzz-worthy posts
              </p>
            </section>
          )}
        </>
      )}
    </section>
  );
};

export default HomePage;