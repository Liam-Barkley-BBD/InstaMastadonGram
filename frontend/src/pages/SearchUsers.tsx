import { useState, useEffect, useCallback, useRef, memo } from "react";
import { Search, UserPlus, UserCheck, MapPin, Users2 } from "lucide-react";
import type { UserProfile } from "../types";
import { userSearchService } from "../fedify/searchUsers";
import "./styles/SearchUsers.css";

interface UserCardProps {
  user: UserProfile;
  isFollowing: boolean;
  isLoading: boolean;
  onFollow: (userId: string) => void;
}

const UserCard = memo(({ user, isFollowing, isLoading, onFollow }: UserCardProps) => {
  const [avatarSrc, setAvatarSrc] = useState(user.avatar || "/default-avatar.png");

  return (
    <div className="card">
      <div className="user-card-content">
        <div className="user-info-section">
          <div className="avatar-container">
            <img
              src={avatarSrc}
              alt={user.username}
              className="user-avatar-large"
              onError={() => setAvatarSrc("/default-avatar.png")}
              loading="lazy"
            />
          </div>

          <div className="user-details">
            <div className="user-name-row">
              <h3 className="user-display-name">{user.displayName}</h3>
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
          onClick={() => onFollow(user.id)}
          className={`follow-btn ${isFollowing ? "follow-btn-following" : "follow-btn-follow"}`}
          disabled={isLoading}
          aria-label={isFollowing ? `Unfollow ${user.username}` : `Follow ${user.username}`}
        >
          {isFollowing ? (
            <>
              <UserCheck size={16} />
              <span>Following</span>
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

const SearchUsersPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousQueryRef = useRef("");
  const debounceTimerRef = useRef<NodeJS.Timeout>();

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
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search users");
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
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
      // Optimistic update
      setFollowingUsers(prev => {
        const newSet = new Set(prev);
        isCurrentlyFollowing ? newSet.delete(userId) : newSet.add(userId);
        return newSet;
      });

      if (isCurrentlyFollowing) {
        await userSearchService.unfollowUser(userId);
      } else {
        await userSearchService.followUser(userId);
      }
    } catch (err) {
      // Revert on error
      setFollowingUsers(prev => {
        const newSet = new Set(prev);
        isCurrentlyFollowing ? newSet.add(userId) : newSet.delete(userId);
        return newSet;
      });
      setError(`Failed to ${isCurrentlyFollowing ? "unfollow" : "follow"} user`);
    }
  }, [followingUsers]);

  return (
    <div className="page-container">
      <div className="container">
        <header className="header">
          <div>
            <h1>Discover People</h1>
            <p>Find and connect with amazing people</p>
          </div>
          <div className="user-info">
            <div className="user-avatar">U</div>
            <span className="username">@username</span>
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

        {error && <div className="error-message">{error}</div>}

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
                {searchResults.map((user) => (
                  <div key={user.id} className="clickable">
                    <UserCard
                      user={user}
                      isFollowing={followingUsers.has(user.id)}
                      isLoading={isLoading}
                      onFollow={handleFollow}
                    />
                  </div>
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