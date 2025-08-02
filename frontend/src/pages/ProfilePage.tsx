import './ProfilePage.css';

const ProfilePage = () => {
  return (
    <div className="main-content-inner profile-container">

    
    <main className="profile-page">
        <header className="profile-header">
          <button className="back-button">‹</button>
          <h2>darlene_beats</h2>
          <button className="menu-button">⋯</button>
        </header>

        <article className="profile-content">
          <section className="profile-info">
            <figure className="profile-avatar">
              <span className="avatar-large"></span>
            </figure>
            
            <div className="profile-details">
              <h1>Darlene Beats</h1>
              <p className="username">@darlene_beats</p>
              
              <div className="stats">
                <div className="stat">
                  <strong>360</strong>
                  <span>Posts</span>
                </div>
                <div className="stat">
                  <strong>160k</strong>
                  <span>Followers</span>
                </div>
                <div className="stat">
                  <strong>140k</strong>
                  <span>Following</span>
                </div>
              </div>
              
              <div className="bio">
                <p>Digital creator & photographer</p>
                <p>Living life one adventure at a time</p>
              </div>
              
              <div className="actions">
                <button className="follow-button">Follow</button>
              </div>
            </div>
          </section>

          <section className="gallery">
            <div className="gallery-grid">
              <article className="gallery-item"></article>
              <article className="gallery-item"></article>
              <article className="gallery-item"></article>
              <article className="gallery-item"></article>
              <article className="gallery-item"></article>
              <article className="gallery-item"></article>
            </div>
          </section>
        </article>
    </main>
    </div>
  );
};

export default ProfilePage;