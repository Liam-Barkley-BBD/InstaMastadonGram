import React, { useEffect, useState } from 'react';
import './ProfilePage.css';
import { FedifyHandler } from '../fedify/fedify';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const x = new FedifyHandler();


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const profileData = await x.getProfile("liambarkley");
        setProfile(profileData);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []); // Empty dependency array means this runs once on mount

  if (loading) {
    return <div>Loading profile...</div>;
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
                  <article key={index} className="gallery-item">
                    {/* You can add post content here based on your post structure */}
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