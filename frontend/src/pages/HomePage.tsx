import React, { useState, useEffect } from "react";
import { Image, MessageCircle } from "lucide-react";
import "./styles/HomePage.css";
import type { Post } from "../types/Post";
import { fetchAllPosts, formatTimestamp } from "../services/post.service";
import LinkPreviewComponent from "../components/LinkPreview";
import { extractLinks } from "../utils/linkUtils";

const HomePage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        const response = await fetchAllPosts();
        setPosts(response.items);
        setError(null);
      } catch (err) {
        console.error("Error loading posts:", err);
        setError("Failed to load posts. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  if (loading) {
    return (
      <section className="beegram-feed">
        <div className="beegram-loading">
          <span className="beegram-loading-emoji">🐝</span>
          <p>Loading posts...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="beegram-feed">
        <div className="beegram-error">
          <span className="beegram-error-emoji">⚠️</span>
          <p>{error}</p>
          <button
            className="beegram-retry-btn"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="beegram-feed">
      {posts.map((post) => (
        <article key={post.id} className="beegram-post">
          {/* Post Header */}
          <header className="beegram-post-header">
            <section className="beegram-post-user">
              <span className="beegram-post-avatar"></span>
              <article>
                <h3 className="beegram-username">{post.actor.name}</h3>
                <time className="beegram-timestamp">
                  {formatTimestamp(post.publishedDate)}
                </time>
              </article>
            </section>

            <button className="beegram-follow-btn">Following</button>
          </header>

          {/* Post Content */}
          <section className="beegram-post-content">
            {post.videoUrl ? (
              <article className="beegram-post-video">
                <video
                  src={post.videoUrl}
                  controls
                  className="beegram-video"
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              </article>
            ) : post.imageUrl ? (
              <article className="beegram-post-image">
                <img
                  src={post.imageUrl}
                  alt="Post content"
                  className="beegram-image"
                  loading="lazy"
                />
              </article>
            ) : (
              <article className="beegram-empty-content">
                <Image size={64} className="beegram-empty-icon" />
                <p className="beegram-empty-title">{post.content}</p>
              </article>
            )}

            {/* Link Previews */}
            {!post.videoUrl &&
              !post.imageUrl &&
              (() => {
                const links = extractLinks(post.content);
                return links.length > 0 ? (
                  <div className="beegram-link-previews">
                    {links.slice(0, 2).map((link, index) => (
                      <LinkPreviewComponent key={index} url={link} />
                    ))}
                  </div>
                ) : null;
              })()}
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
              <span className="beegram-username">{post.actor.name}</span>
              <span className="beegram-description-text">{post.content}</span>
            </div>
            <time className="beegram-post-time">
              {formatTimestamp(post.publishedDate)}
            </time>
          </section>
        </article>
      ))}

      {/* Empty State */}
      {posts.length === 0 && (
        <section className="beegram-empty-state">
          <span className="beegram-empty-emoji">🐝</span>
          <h2 className="beegram-empty-heading">Welcome to the Hive!</h2>
          <p className="beegram-empty-text">
            No posts yet. Be the first to share something!
          </p>
          <button className="beegram-discover-btn">Create Post</button>
        </section>
      )}
    </section>
  );
};

export default HomePage;
