import { useState, useEffect, useCallback, useRef, memo } from "react";
import { Search, UserPlus, UserCheck, Users2 } from "lucide-react";
// import type { UserProfile } from "../types";
import { userSearchService } from "../fedify/searchUsers";
import "./styles/SearchUsers.css";
import ProfilePage from "./ProfilePage";
import useAuth from "../services/user.service";
import { follow } from "../services/activities.service";

interface UserCardProps {
  user: any;
  isFollowing: boolean;
  isLoading: boolean;
  onFollow: (userId: string) => void;
  onUserClick: (userId: string) => void;
  currentUser: any; // Add currentUser prop
}

function removeForwardSlashes(str: string) {
  return str.replace(/\//g, '');
}

const UserCard = memo(({ user, isFollowing, isLoading, onFollow, onUserClick, currentUser }: UserCardProps) => {
  const [avatarSrc, setAvatarSrc] = useState(user.avatar || "/default-avatar.png");
  
  const handleCardClick = useCallback(() => {
    onUserClick(user.id);
  }, [user.id, onUserClick]);

  const handleFollowClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Safety check for user URL
    if (!user.url) {
      console.error('User URL is missing');
      return;
    }
    
    try {
      const userUrl = new URL(user.url);
      
      // Safety check for currentUser
      if (!currentUser?.handle) {
        console.error('Current user handle is missing');
        return;
      }
      
      follow({
        actorHandle: `${removeForwardSlashes(userUrl.pathname)}@${removeForwardSlashes(userUrl.hostname)}`,
        userName: currentUser.handle,
        activity: 'follow'
      });
      
      // Call the onFollow callback
      onFollow(user.id);
    } catch (error) {
      console.error('Error processing follow action:', error);
    }
  }, [user.url, user.id, currentUser?.handle, onFollow]);

  const handleAvatarError = useCallback(() => {
    setAvatarSrc("/default-avatar.png");
  }, []);
  
  return (
    <div className="card clickable" onClick={handleCardClick}>
      <div className="user-card-content">
        <div className="user-info-section">
          <div className="avatar-container">
            <img
              src={avatarSrc}
              alt={user.username || 'User avatar'}
              className="user-avatar-large"
              onError={handleAvatarError}
              loading="lazy"
            />
          </div>

          <div className="user-details">
            <div className="user-name-row">
              <h3 className="user-display-name">{user.displayName || user.username}</h3>
            </div>
            <p className="username-text">@{user.username}</p>
            {user.bio && <p className="user-bio">{user.bio}</p>}

            <div className="user-stats">
              <span className="stat-item">
                <Users2 size={12} className="stat-icon" />
                {user.followersCount?.toLocaleString() || 0} followers
              </span>
              <span className="stat-item">
                {user.postsCount?.toLocaleString() || 0} posts
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleFollowClick}
          className={`follow-btn ${isFollowing ? "follow-btn-following" : "follow-btn-follow"}`}
          disabled={isLoading}
          aria-label={isFollowing ? `Unfollow ${user.username}` : `Follow ${user.username}`}
        >
          {isFollowing ? (
            <>
              <UserCheck size={16} />
              <span>Unfollow</span>
            </>
          ) : (
            <>
              <UserPlus size={16} />
              <span>Follow</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

// Add display name for debugging
UserCard.displayName = 'UserCard';

const SearchUsersPage = () => {
  const { user } = useAuth();
  const [viewingProfile, setViewingProfile] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousQueryRef = useRef("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUserClick = useCallback((userId: string) => {
    const foundUser = searchResults.find(u => u.id === userId);
    if (foundUser) {
      setViewingProfile(foundUser);
    }
  }, [searchResults]);

  const handleBackToList = useCallback(() => {
    setViewingProfile(null);
  }, []);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      previousQueryRef.current = "";
      return;
    }

    if (query === previousQueryRef.current) return;
    previousQueryRef.current = query;

    setIsLoading(true);
    setError(null);
    
    try {
      const results = await userSearchService.searchUsers(query);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : "Failed to search users");
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchUsers(searchQuery);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, searchUsers]);

  const handleFollow = useCallback(async (userId: string) => {
    const isCurrentlyFollowing = followingUsers.has(userId);
    
    try {
      // Optimistically update UI
      setFollowingUsers(prev => {
        const newSet = new Set(prev);
        isCurrentlyFollowing ? newSet.delete(userId) : newSet.add(userId);
        return newSet;
      });

      // Call API
      if (isCurrentlyFollowing) {
        await userSearchService.unfollowUser(userId);
      } else {
        await userSearchService.followUser(userId);
      }
    } catch (err) {
      console.error('Follow/unfollow error:', err);
      
      // Revert optimistic update on error
      setFollowingUsers(prev => {
        const newSet = new Set(prev);
        isCurrentlyFollowing ? newSet.add(userId) : newSet.delete(userId);
        return newSet;
      });
      
      setError(`Failed to ${isCurrentlyFollowing ? "unfollow" : "follow"} user`);
    }
  }, [followingUsers]);

  // Clear error after a delay
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (viewingProfile) {
    return (
      <div className="profile-view-container">
        <button className="back-to-list-btn" onClick={handleBackToList}>
          <span className="back-arrow">←</span>
          Back to list
        </button>
        <ProfilePage handle={viewingProfile.id} isProfileTab={false}/>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container">
        <header className="header">
          <div>
            <h1>Discover People</h1>
            <p>Find and connect with amazing people</p>
          </div>
          <div className="user-info">
            <div className="user-avatar">
              {user?.handle ? user.handle.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="username">{user?.handle || 'Guest'}</span>
          </div>
        </header>

        <div className="search-container">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name or username..."
              className="search-input"
              aria-label="Search users"
              enterKeyHint="search"
            />
          </div>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {searchQuery && (
          <section className="mb-8">
            <h2 className="section-title mb-4">
              {isLoading ? "Searching..." : `Results (${searchResults.length})`}
            </h2>

            {isLoading ? (
              <div className="results-list">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="card">
                    <div className="skeleton-container">
                      <div className="skeleton skeleton-avatar"></div>
                      <div className="skeleton-content">
                        <div className="skeleton skeleton-text skeleton-text-wide"></div>
                        <div className="skeleton skeleton-text-small skeleton-text-narrow"></div>
                      </div>
                      <div className="skeleton skeleton-button"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="results-list">
                {searchResults.map((user: any) => (
                  <UserCard
                    key={user.id || user.username || Math.random()}
                    user={user}
                    isFollowing={followingUsers.has(user.id)}
                    isLoading={isLoading}
                    onFollow={handleFollow}
                    onUserClick={handleUserClick}
                    currentUser={user} // Pass current user
                  />
                ))}
              </div>
            ) : (
              <div className="card empty-state">
                <div className="empty-icon">
                  <Search size={32} style={{ color: "#9ca3af" }} />
                </div>
                <p className="empty-title">No users found</p>
                <p className="empty-description">
                  Try different search terms
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default SearchUsersPage;