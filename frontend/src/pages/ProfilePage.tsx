import { useEffect, useState, useCallback, useRef } from 'react';
import './styles/ProfilePage.css';
import { FedifyHandler } from '../fedify/fedify';
import { follow } from '../services/activities.service';
import { isCurrentUser } from '../services/user.service';
import useAuth from '../services/user.service';
import PostModal from '../components/PostModal';

interface Props {

  handle: UserProfile;
  isProfileTab:boolean;
  preloadedData?:any

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

const ProfilePage = ({ handle, isProfileTab, preloadedData}: Props) => {
  const { user } = useAuth();
  const isViewingOwnProfile = isCurrentUser(user?.handle || '');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const fedifyHandler = useRef(new FedifyHandler());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("preloadeddata",preloadedData)

        const profileData: any = preloadedData?preloadedData:await fedifyHandler.current.getProfile(handle);

        setProfile(profileData);
        setPosts(profileData.posts || []);
        setHasMorePosts(profileData.posts?.length === 20);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [handle]);

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
        setPosts(prevPosts => [...prevPosts, ...morePostsData.items]);
        setCurrentPage(nextPage);
        setHasMorePosts(morePostsData.hasNextPage);
      } else {
        setHasMorePosts(false);
      }
    } catch (err) {
      console.error('Error loading more posts:', err);
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
        rootMargin: '100px'
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

  const renderPostContent = (content: string | PostContent[]) => {
    if (typeof content === 'string') {
      return (
        <div className="post-content">
          <div className="post-text">
            <p>{content.replace(/<[^>]*>/g, '')}</p>
          </div>
        </div>
      );
    }

    if (Array.isArray(content)) {
      return (
        <div className="post-content">
          {content.map((item, index) => {
            if (item.type === 'Document' && item.mediaType?.startsWith('image/')) {
              return (
                <div key={index} className="post-image">
                  <img 
                    src={item.url} 
                    alt={item.name || 'Post image'} 
                    loading="lazy"
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="main-content-inner profile-container">
        <main className="profile-page">
          <header className="profile-header">
            <button className="back-button">‹</button>
            <div className="skeleton skeleton-text skeleton-username"></div>
            <button className="menu-button">⋯</button>
          </header>

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
                  <div className="skeleton skeleton-text skeleton-bio-line skeleton-bio-short"></div>
                </div>
                <div className="actions">
                  <div className="skeleton skeleton-button"></div>
                </div>
              </div>
            </section>

            <section className="gallery">
              <div className="gallery-grid">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="skeleton skeleton-gallery-item"></div>
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
          {isProfileTab &&
          <header className="profile-header">
            <button className="back-button">‹</button>
            <h2>{profile.username}</h2>
            <button className="menu-button">⋯</button>
          </header>}

          <article className="profile-content">
            <section className="profile-info">
              <figure className="profile-avatar">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Profile Avatar" className="avatar-large" />
                ) : (
                  <span className="avatar-large" />
                )}
              </figure>
              <div className="profile-details">
                <h1>{profile.displayName || profile.username}</h1>
                <p className="username">@{profile.username}</p>
                <div className="stats">
                  <div className="stat">
                    <strong>{profile.postsCount}</strong>
                    <span>Posts</span>
                  </div>
                  <div className="stat">
                    <strong>{profile.followersCount}</strong>
                    <span>Followers</span>
                  </div>
                  <div className="stat">
                    <strong>{profile.followingCount}</strong>
                    <span>Following</span>
                  </div>
                </div>
                <div className="bio">
                  {profile.bio ? <p>{profile.bio}</p> : <p>No bio available</p>}
                </div>
                <div className="actions">
                  {!isViewingOwnProfile && <button className="follow-button">Follow</button>}
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
                        {renderPostContent(post.textcontent || post.imagecontent)}
                        <div className="post-meta">
                          <span className="post-date">
                            {new Date(post.publishedDate).toLocaleDateString()}
                          </span>
                          <div className="post-stats">
                            <span>♥ {post.likes}</span>
                          </div>
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
                              <div key={index} className="skeleton skeleton-gallery-item"></div>
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
      
    <PostModal isOpen={isModalOpen} post={selectedPost} profile={profile} onClose={closeModal} />    </>
  );
};

export default ProfilePage;