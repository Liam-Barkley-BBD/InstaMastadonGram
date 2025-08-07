import React, { useState, useEffect, useCallback, useRef } from "react";
import { MessageCircle } from "lucide-react";
import "./styles/HomePage.css";
import type { Post } from "../types/Post";
import { fetchAllPosts, formatTimestamp } from "../services/post.service";
import LinkPreviewComponent from "../components/LinkPreview";
import MediaGrid from "../components/MediaGrid";
import { extractLinks } from "../utils/linkUtils";

const HomePage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [, setPagesLoaded] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const loadPosts = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        if (pageNum === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const response = await fetchAllPosts(pageNum, 20);

        if (append) {
          setPosts((prevPosts) => [...prevPosts, ...response.items]);
        } else {
          setPosts(response.items);
        }

        setHasNextPage(response.hasNextPage || false);
        setPagesLoaded(response.pagesLoaded || pageNum);
        setError(null);
      } catch (err) {
        console.error("Error loading posts:", err);
        setError("Failed to load posts. Please try again later.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    loadPosts(1, false);
  }, [loadPosts]);

  // Infinite scroll setup
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasNextPage && !loadingMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadPosts(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current = observer;

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasNextPage, loadingMore, loading, page, loadPosts]);

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
            onClick={() => {
              setPage(1);
              loadPosts(1, false);
            }}
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
                <h3 className="beegram-username">
                  {post.instance && post.instance !== "localhost" ? (
                    <a
                      href={`https://${post.actor.domain || post.instance}/@${
                        post.actor.handle
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="beegram-username-link"
                    >
                      {post.actor.name}
                    </a>
                  ) : (
                    post.actor.name
                  )}
                </h3>
                <div className="beegram-post-meta">
                  <time className="beegram-timestamp">
                    {formatTimestamp(post.publishedDate)}
                  </time>
                  {post.instance && post.instance !== "localhost" && (
                    <a
                      href={`https://${post.actor.domain || post.instance}/@${
                        post.actor.handle
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="beegram-instance-badge beegram-instance-link"
                    >
                      @{post.actor.handle}@{post.actor.domain || post.instance}
                    </a>
                  )}
                </div>
              </article>
            </section>

            <button className="beegram-follow-btn">Following</button>
          </header>

          {/* Post Content */}
          <section className="beegram-post-content">
            {post.mediaItems && post.mediaItems.length > 0 ? (
              <MediaGrid mediaItems={post.mediaItems} postId={post.id} />
            ) : post.videoUrl ? (
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
              <article className="beegram-text-content">
                <p className="beegram-text">{post.content}</p>
              </article>
            )}

            {/* Link Previews */}
            {!post.mediaItems?.length &&
              !post.videoUrl &&
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
              <span className="beegram-username">
                {post.instance && post.instance !== "localhost" ? (
                  <a
                    href={`https://${post.actor.domain || post.instance}/@${
                      post.actor.handle
                    }`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="beegram-username-link"
                  >
                    {post.actor.name}
                  </a>
                ) : (
                  post.actor.name
                )}
              </span>
              <span className="beegram-description-text">{post.content}</span>
            </div>
            <time className="beegram-post-time">
              {formatTimestamp(post.publishedDate)}
            </time>
          </section>
        </article>
      ))}

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="beegram-loading-more">
          <span className="beegram-loading-emoji">🐝</span>
          <p>Loading more posts...</p>
        </div>
      )}

      {/* Intersection observer target for infinite scroll */}
      <div ref={loadingRef} style={{ height: "20px", margin: "20px 0" }} />

      {/* Empty State */}
      {posts.length === 0 && !loading && (
        <section className="beegram-empty-state">
          <span className="beegram-empty-emoji">🐝</span>
          <h2 className="beegram-empty-heading">Welcome to the IMDG!</h2>
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
