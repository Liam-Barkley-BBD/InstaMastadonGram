import { useEffect, useState } from 'react';
import './ProfilePage.css';
import { FedifyHandler } from '../fedify/fedify';

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
  replies: number;
  shares: number;
  likes: number;
}

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  url: string;
  publishedDate: string;
  discoverable: boolean;
  followers: User[];
  following: User[];
  posts: Post[];
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const x = new FedifyHandler();
        const profileData = await x.getProfile("liambarkley");
        console.log(JSON.stringify(profileData, null, 2));
        setProfile(profileData);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []); // Empty dependency array means this runs once on mount

  const renderPostContent = (content: string | PostContent[]) => {
    if (typeof content === 'string') {
      return (
        <div className="post-content">
          <div className="post-text">
            <p>{content}</p>
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
    <div className="main-content-inner profile-container">
      <main className="profile-page">
        <header className="profile-header">
          <button className="back-button">‹</button>
          <h2>{profile.username}</h2>
          <button className="menu-button">⋯</button>
        </header>

        <article className="profile-content">
          <section className="profile-info">
            <figure className="profile-avatar">
              <span className="avatar-large"></span>
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
                {profile.bio ? (
                  <p>{profile.bio}</p>
                ) : (
                  <p>No bio available</p>
                )}
              </div>
                             
              <div className="actions">
                <button className="follow-button">Follow</button>
              </div>
            </div>
          </section>

          <section className="gallery">
            {profile.posts && profile.posts.length > 0 ? (
              <div className="gallery-grid">
                {profile.posts.slice(0, 6).map((post, index) => (
                  <article key={post.id || index} className="gallery-item">
                    {renderPostContent(post.content)}
                    <div className="post-meta">
                      <span className="post-date">
                        {new Date(post.publishedDate).toLocaleDateString()}
                      </span>
                      <div className="post-stats">
                        <span>♥ {post.likes}</span>
                        <span>↗ {post.shares}</span>
                        <span>💬 {post.replies}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="no-posts">
                <p>No posts yet</p>
              </div>
            )}
          </section>
        </article>
      </main>
    </div>
  );
};

export default ProfilePage;