import { useEffect, useState, useCallback, useRef } from "react";
import "./styles/ProfilePage.css";
import { FedifyHandler } from "../fedify/fedify";
import { follow } from "../services/activities.service";
import useAuth from "../services/user.service";
import PostModal from "../components/PostModal";
import { Link, useSearchParams } from "react-router-dom";

interface Props {
  handle?: string;
  isProfileTab?: boolean;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  url: string;
  avatar?: string;
}

interface PostContent {
  type: string;
  mediaType?: string;
  url?: string;
  name?: string;
  blurhash?: string;
  focalPoint?: number[];
  width?: number;
  height?: number;
}

interface Post {
  id: string;
  content: string | PostContent[];
  publishedDate: string;
  url: string;
  likes: number;
  shares?: number;
}

interface UserProfile {
  id: string;
  avatar?: string;
  username: string;
  displayName: string;
  bio: string;
  url: string;
  publishedDate: string;
  followers: User[];
  following: User[];
  posts: Post[];
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

function removeForwardSlashes(str: string) {
  return str.replace(/\//g, "");
}

function normalizeUrl(u?: string) {
  if (!u) return u;
  try {
    const url = new URL(u);
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return u.replace(/\/+$/, "");
  }
}

const ProfilePage = ({ handle }: Props) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);

  const url = useSearchParams();

  const fedifyHandler = useRef(new FedifyHandler());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user !== undefined) {
      setAuthLoaded(true);
    }
  }, [user]);

  const isViewingOwnProfile = authLoaded && user?.url === handle;

  useEffect(() => {
    if (url[0].size === 1) {
      handle = url[0].get("user") as string;
    }
    
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const profileData: any = await fedifyHandler.current.getProfile(
          undefined,
          handle
        );
        setProfile(profileData);
        setPosts(profileData.posts || []);
        setHasMorePosts(profileData.posts?.length === 20);
        setCurrentPage(1);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [handle]);

  // get logged in users follow list
  useEffect(() => {
    if (!authLoaded || !user || isViewingOwnProfile) return;
    if (!profile) return;

    let cancelled = false;
    const checkFollowingStatus = async () => {
      setIsFollowLoading(true);
      setFollowError(null);
      try {
        const base = user.url ? user.url.replace(/\/+$/, "") : user.url;
        const followingUrl = `${base}/following?cursor=1`;

        const resp = await fetch(followingUrl, {
          headers: {
            Accept: "application/activity+json",
          },
        });

        if (!resp.ok) {
          console.warn(`Failed fetching following list: ${resp.status}`);
          if (!cancelled) setIsFollowing(false);
          return;
        }

        const data = await resp.json();
        const items: string[] = data.orderedItems || [];

        const profileNormalized = normalizeUrl(profile.id);
        console.log(profile);
        console.log(profileNormalized);
        const found = items.some((itemUrl: string) => {
          console.log(normalizeUrl(itemUrl));
          return normalizeUrl(itemUrl) === profileNormalized;
        });

        if (!cancelled) setIsFollowing(found);
      } catch (err) {
        console.error("Error checking following status:", err);
      } finally {
        if (!cancelled) setIsFollowLoading(false);
      }
    };

    checkFollowingStatus();

    return () => {
      cancelled = true;
    };
  }, [authLoaded, user, profile, isViewingOwnProfile]);

  const loadMorePosts = useCallback(async () => {
    if (!profile || loadingMorePosts || !hasMorePosts) return;

    try {
      setLoadingMorePosts(true);
      const nextPage = currentPage + 1;
      const morePostsData = await fedifyHandler.current.getPostsPaginated(
        profile.username,
        undefined,
        nextPage,
        20
      );

      if (morePostsData.items && morePostsData.items.length > 0) {
        setPosts((prevPosts) => [...prevPosts, ...morePostsData.items]);
        setCurrentPage(nextPage);
        setHasMorePosts(morePostsData.hasNextPage);
      } else {
        setHasMorePosts(false);
      }
    } catch (err) {
      console.error("Error loading more posts:", err);
    } finally {
      setLoadingMorePosts(false);
    }
  }, [profile, currentPage, loadingMorePosts, hasMorePosts]);

  useEffect(() => {
    if (!hasMorePosts || loadingMorePosts) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          loadMorePosts();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMorePosts, loadingMorePosts, loadMorePosts]);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  const renderPostContent = (
    textContent: string | PostContent[] | PostContent,
    mediaContent: string | PostContent[] | PostContent
  ) => {
    return (
      <div className="post-content">
        {/* Render text content */}
        {textContent && (
          <div className="post-text">
            {typeof textContent === "string" ? (
              <p>{textContent.replace(/<[^>]*>/g, "")}</p>
            ) : (
              <p>Text content available</p>
            )}
          </div>
        )}

        {/* Render media content (images and videos) */}
        {renderMediaContent(mediaContent)}
      </div>
    );
  };

  const renderMediaContent = (
    mediaContent: string | PostContent[] | PostContent
  ) => {
    // Helper function to check if content is an image
    const isImage = (item: PostContent) => {
      return (
        (item.type === "Document" || item.type === "Image") &&
        item.mediaType?.startsWith("image/")
      );
    };

    // Helper function to check if content is a video
    const isVideo = (item: PostContent) => {
      return (
        (item.type === "Document" || item.type === "Video") &&
        item.mediaType?.startsWith("video/")
      );
    };

    // Handle single PostContent object
    if (
      typeof mediaContent === "object" &&
      mediaContent !== null &&
      !Array.isArray(mediaContent)
    ) {
      if (isImage(mediaContent)) {
        return (
          <div className="post-image">
            <img
              src={mediaContent.url}
              alt={mediaContent.name || "Post image"}
              loading="lazy"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "400px",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
          </div>
        );
      }

      if (isVideo(mediaContent)) {
        return (
          <div className="post-video">
            <video
              src={mediaContent.url}
              controls
              preload="metadata"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "400px",
                objectFit: "contain",
                borderRadius: "8px",
              }}
              aria-label={mediaContent.name || "Post video"}
            >
              <source src={mediaContent.url} type={mediaContent.mediaType} />
              Your browser does not support the video tag.
            </video>
            {mediaContent.name && (
              <div className="video-overlay">
                <div className="play-button">▶</div>
              </div>
            )}
          </div>
        );
      }
      return null;
    }

    // Handle array of PostContent objects
    if (Array.isArray(mediaContent)) {
      return (
        <>
          {mediaContent.map((item, index) => {
            if (isImage(item)) {
              return (
                <div key={index} className="post-image">
                  <img
                    src={item.url}
                    alt={item.name || "Post image"}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "auto",
                      maxHeight: "400px",
                      objectFit: "contain",
                      borderRadius: "8px",
                    }}
                  />
                </div>
              );
            }

            if (isVideo(item)) {
              return (
                <div key={index} className="post-video">
                  <video
                    src={item.url}
                    controls
                    preload="metadata"
                    style={{
                      width: "100%",
                      height: "auto",
                      maxHeight: "400px",
                      objectFit: "contain",
                      borderRadius: "8px",
                    }}
                    aria-label={item.name || "Post video"}
                  >
                    <source src={item.url} type={item.mediaType} />
                    Your browser does not support the video tag.
                  </video>
                  {item.name && (
                    <div className="video-overlay">
                      <div className="play-button">▶</div>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })}
        </>
      );
    }

    return null;
  };

  const handleFollowClick = useCallback(async () => {
    if (!authLoaded || !user || !profile) return;
    if (isFollowing) return;

    setIsFollowLoading(true);
    setFollowError(null);

    setIsFollowing(true);

    try {
      const userUrl = new URL(profile.url || profile.id);
      const actorHandle = `${removeForwardSlashes(
        userUrl.pathname
      )}@${removeForwardSlashes(userUrl.hostname)}`;

      await follow({
        actorHandle,
        userName: user.handle,
        activity: "follow",
      });
    } catch (err) {
      console.error("Failed to follow user:", err);
      setIsFollowing(false); // rollback
      setFollowError("Failed to follow user. Please try again.");
    } finally {
      setIsFollowLoading(false);
    }
  }, [authLoaded, user, profile, isFollowing]);

  if (loading) {
    return (
      <div className="main-content-inner profile-container">
        <main className="profile-page">
          <article className="profile-content">
            <section className="profile-info">
              <figure className="profile-avatar">
                <div className="skeleton skeleton-avatar"></div>
              </figure>
              <div className="profile-details">
                <div className="skeleton skeleton-text skeleton-display-name"></div>
                <div className="skeleton skeleton-text skeleton-handle"></div>
                <div className="stats">
                  <div className="stat">
                    <div className="skeleton skeleton-text skeleton-stat-number"></div>
                    <span>Posts</span>
                  </div>
                  <div className="stat">
                    <div className="skeleton skeleton-text skeleton-stat-number"></div>
                    <span>Followers</span>
                  </div>
                  <div className="stat">
                    <div className="skeleton skeleton-text skeleton-stat-number"></div>
                    <span>Following</span>
                  </div>
                </div>
                <div className="bio">
                  <div className="skeleton skeleton-text skeleton-bio-line"></div>
                  <div className="skeleton skeleton-text skeleton-bio-short"></div>
                </div>
                <div className="actions">
                  <div className="skeleton skeleton-button"></div>
                </div>
              </div>
            </section>

            <section className="gallery">
              <div className="gallery-grid">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={index}
                    className="skeleton skeleton-gallery-item"
                  ></div>
                ))}
              </div>
            </section>
          </article>
        </main>
      </div>
    );
  }

  if (error) {
    return <div>Error loading profile: {error}</div>;
  }

  if (!profile) {
    return <div>No profile data available</div>;
  }

  return (
    <>
      <div className="main-content-inner profile-container">
        <main className="profile-page">
          <article className="profile-content">
            <section className="profile-info">
              <figure className="profile-avatar">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="Profile Avatar"
                    className="avatar-large"
                  />
                ) : (
                  <span className="avatar-large" />
                )}
              </figure>
              <div className="profile-details">
                <h1>{profile.displayName || profile.username}</h1>
                <p className="username">
                  @{profile.username}@{new URL(profile.id).hostname}
                </p>
                <div className="stats">
                  <div className="stat">
                    <strong>{profile.postsCount}</strong>
                    <span>Posts</span>
                  </div>
                  <Link to={`/users/${profile.username}/followers`}>
                    <div className="stat">
                      <strong>{profile.followersCount}</strong>
                      <span>Followers</span>
                    </div>
                  </Link>
                  <Link to={`/users/${profile.username}/following`}>
                    <div className="stat">
                      <strong>{profile.followingCount}</strong>
                      <span>Following</span>
                    </div>
                  </Link>
                </div>
                <div className="actions">
                  {authLoaded && !isViewingOwnProfile && (
                    <button
                      className={`follow-button ${
                        isFollowing ? "following" : ""
                      }`}
                      onClick={handleFollowClick}
                      disabled={isFollowLoading || isFollowing}
                      aria-label={
                        isFollowing
                          ? `Following ${profile.username}`
                          : `Follow ${profile.username}`
                      }
                    >
                      {isFollowLoading
                        ? "..."
                        : isFollowing
                        ? "Following"
                        : "Follow"}
                    </button>
                  )}
                  {followError && <p className="error-text">{followError}</p>}
                </div>
              </div>
            </section>

            <section className="gallery">
              {posts && posts.length > 0 ? (
                <>
                  <div className="gallery-grid">
                    {posts.map((post, index) => (
                      <article
                        key={post.id || index}
                        className="gallery-item clickable-post"
                        onClick={() => handlePostClick(post)}
                      >
                        {renderPostContent(
                          post.textcontent,
                          post.imagecontent ||
                            post.videocontent ||
                            post.mediacontent
                        )}
                        <div className="post-meta">
                          <span className="post-date">
                            {new Date(post.publishedDate).toLocaleDateString()}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                  {hasMorePosts && (
                    <div ref={loadMoreRef} className="load-more-trigger">
                      {loadingMorePosts && (
                        <div className="loading-more">
                          <div className="skeleton-grid">
                            {Array.from({ length: 4 }, (_, index) => (
                              <div
                                key={index}
                                className="skeleton skeleton-gallery-item"
                              ></div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!hasMorePosts && posts.length > 0 && (
                    <div className="end-of-posts">
                      <p>You've reached the end!</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-posts">
                  <p>No posts yet</p>
                </div>
              )}
            </section>
          </article>
        </main>
      </div>
      <PostModal
        isOpen={isModalOpen}
        post={selectedPost}
        profile={profile}
        onClose={closeModal}
      />
    </>
  );
};

export default ProfilePage;
