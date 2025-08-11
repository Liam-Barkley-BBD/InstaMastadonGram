import { useState, useCallback, useRef, memo, useEffect } from "react";
import { Search, UserPlus, UserCheck, Users2, X, Clock } from "lucide-react";
import { userSearchService } from "../fedify/searchUsers";
import "./styles/SearchUsers.css";
import ProfilePage from "./ProfilePage";
import useAuth from "../services/user.service";
import { follow } from "../services/activities.service";
import { actorUrlToHandle } from "../utils/helper.function";
import type { UserProfile } from "../types";

interface UserCardProps {
  user: any;
  isFollowing: boolean;
  isLoading: boolean;
  onFollow: (userId: string) => void;
  onUserClick: (userId: string) => void;
  currentUser: any;
  showRemove?: boolean;
  onRemove?: (userId: string) => void;
}

const UserCard = memo(
  ({
    user,
    isFollowing,
    isLoading,
    onFollow,
    onUserClick,
    currentUser,
    showRemove = false,
    onRemove,
  }: UserCardProps) => {
    const [avatarSrc, setAvatarSrc] = useState(
      user.avatar || "/default-avatar.png"
    );

    const handleCardClick = useCallback(() => {
      onUserClick(user.id);
    }, [user.id, onUserClick]);

    const handleFollowClick = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click

        const currentUserHandle: string = currentUser.handle;
        const actorHandle: string = actorUrlToHandle(user.id);

        if (!user.url || !currentUser?.handle) {
          console.error("Missing required user information");
          return;
        }

        try {
          if (isFollowing) {
            await follow({
              actorHandle: actorHandle,
              userName: currentUserHandle,
              activity: "unfollow",
            });
          } else {
            await follow({
              actorHandle: actorHandle,
              userName: currentUserHandle,
              activity: "follow",
            });
          }

          onFollow(user.id);
        } catch (error) {
          console.error("Error processing follow action:", error);
        }
      },
      [user.url, user.id, currentUser?.handle, onFollow, isFollowing]
    );

    const handleRemoveClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        if (onRemove) {
          onRemove(user.id);
        }
      },
      [user.id, onRemove]
    );

    const handleAvatarError = useCallback(() => {
      setAvatarSrc("/default-avatar.png");
    }, []);

    return (
      <div className="card">
        <div className="user-card-content clickable" onClick={handleCardClick}>
          <div className="user-info-section">
            <div className="avatar-container">
              <img
                src={avatarSrc}
                alt={user.username || "User avatar"}
                className="user-avatar-large"
                onError={handleAvatarError}
                loading="lazy"
              />
            </div>

            <div className="user-details">
              <div className="user-name-row">
                <h3 className="user-display-name">
                  {user.displayName || user.username}
                </h3>
                {showRemove && (
                  <button
                    onClick={handleRemoveClick}
                    className="remove-search-btn"
                    aria-label={`Remove ${user.username} from recent searches`}
                  >
                    <X size={14} />
                  </button>
                )}
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
        </div>

        {!showRemove && (
          <div className="follow-button-wrapper">
            <button
              onClick={handleFollowClick}
              className={`follow-btn ${
                isFollowing ? "follow-btn-following" : "follow-btn-follow"
              }`}
              disabled={isLoading}
              aria-label={
                isFollowing
                  ? `Unfollow ${user.username}`
                  : `Follow ${user.username}`
              }
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
        )}
      </div>
    );
  }
);

UserCard.displayName = "UserCard";

const SearchUsersPage = () => {
  const { user: currentUser } = useAuth();
  const [recentSearches, setRecentSearches] = useState<UserProfile[]>([]);
  const [viewingProfile, setViewingProfile] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecentSearches, setShowRecentSearches] = useState(true);
  const previousQueryRef = useRef("");

  const isValidHandleFormat = (query: string) => {
    return /^[^@]+@[^@]+$/.test(query.trim());
  };

  const loadRecentSearches = useCallback(async () => {
    try {
      const recent = await userSearchService.getRecentSearches(
        currentUser?.handle ?? ""
      );
      const parsed = recent.recent_searches.map((item: string) =>
        JSON.parse(item)
      );
      setRecentSearches(parsed);
    } catch (error) {
      console.warn("Failed to load recent searches:", error);
      setRecentSearches([]);
    }
  }, [currentUser?.handle]);

  const saveToRecentSearches = useCallback(
    async (profile: any) => {
      try {
        // Add to recent searches when user clicks on a profile
        await userSearchService.addRecentSearch(
          currentUser?.handle ?? "",
          profile
        );
        await loadRecentSearches(); // Refresh the list
      } catch (error) {
        console.warn("Failed to save to recent searches:", error);
      }
    },
    [currentUser?.handle, loadRecentSearches]
  );

  const removeFromRecentSearches = useCallback(async () => {
    try {
      await userSearchService.clearRecentSearches(currentUser?.handle ?? "");
      await loadRecentSearches(); // Refresh the list
    } catch (error) {
      console.warn("Failed to remove from recent searches:", error);
    }
  }, [currentUser?.handle, loadRecentSearches]);

  const clearAllRecentSearches = useCallback(async () => {
    try {
      await userSearchService.clearRecentSearches(currentUser?.handle ?? "");
      setRecentSearches([]);
    } catch (error) {
      console.warn("Failed to clear recent searches:", error);
    }
  }, [currentUser?.handle]);

  useEffect(() => {
    if (currentUser?.handle) {
      loadRecentSearches();
    }
  }, [loadRecentSearches, currentUser?.handle]);

  const handleUserClick = useCallback(
    (userId: string) => {
      let foundUser;

      // Find user in current results or recent searches
      if (hasSearched && searchResults.length > 0) {
        foundUser = searchResults.find((u) => u.id === userId);
      } else {
        foundUser = recentSearches.find((u) => u.id === userId);
      }

      if (foundUser) {
        setViewingProfile(foundUser);
        saveToRecentSearches(foundUser);
      }
    },
    [searchResults, recentSearches, hasSearched, saveToRecentSearches]
  );

  const handleBackToList = useCallback(() => {
    setViewingProfile(null);
  }, []);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setShowRecentSearches(true);
      previousQueryRef.current = "";
      setError(null);
      return;
    }

    if (!isValidHandleFormat(query)) {
      setError("Search format must be <handle>@<domain>");
      setSearchResults([]);
      setShowRecentSearches(false);
      return;
    }

    if (query === previousQueryRef.current) return;
    previousQueryRef.current = query;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setShowRecentSearches(false);

    try {
      const results = await userSearchService.searchUsers(query);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search users");
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);

      if (!value.trim()) {
        setHasSearched(false);
        setShowRecentSearches(true);
        setSearchResults([]);
        setError(null);
      }
    },
    []
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        searchUsers(searchQuery);
      }
    },
    [searchQuery, searchUsers]
  );

  const handleFollow = useCallback(
    async (userId: string) => {
      const isCurrentlyFollowing = followingUsers.has(userId);
      const userToFollow = searchResults.find((u) => u.id === userId);

      if (!userToFollow?.url || !currentUser?.handle) {
        setError("Missing required user information");
        return;
      }

      try {
        setFollowingUsers((prev) => {
          const newSet = new Set(prev);
          isCurrentlyFollowing ? newSet.delete(userId) : newSet.add(userId);
          return newSet;
        });
      } catch {
        setFollowingUsers((prev) => {
          const newSet = new Set(prev);
          isCurrentlyFollowing ? newSet.add(userId) : newSet.delete(userId);
          return newSet;
        });

        setError(
          `Failed to ${isCurrentlyFollowing ? "unfollow" : "follow"} user`
        );
      }
    },
    [followingUsers, searchResults, currentUser]
  );

  if (viewingProfile) {
    return (
      <div className="profile-view-container">
        <button className="back-to-list-btn" onClick={handleBackToList}>
          <span className="back-arrow">←</span>
          Back to list
        </button>
        <ProfilePage handle={viewingProfile.id} isProfileTab={false} />
      </div>
    );
  }

  const shouldShowRecentSearches =
    showRecentSearches && !hasSearched && recentSearches.length > 0;
  const shouldShowSearchResults = hasSearched && searchResults.length > 0;
  const shouldShowEmptyState =
    hasSearched && searchResults.length === 0 && !isLoading;

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
              {currentUser?.handle
                ? currentUser.handle.charAt(0).toUpperCase()
                : "U"}
            </div>
            <span className="username">{currentUser?.handle || "Guest"}</span>
          </div>
        </header>

        <div className="search-container">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Search users (format: handle@domain)"
              className="search-input"
              aria-label="Search users"
              enterKeyHint="search"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setHasSearched(false);
                  setShowRecentSearches(true);
                  setSearchResults([]);
                  setError(null);
                }}
                className="clear-search-btn"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
            <button
              onClick={() => searchUsers(searchQuery)}
              className="search-btn"
              disabled={!searchQuery.trim()}
            >
              Search
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {/* Recent Searches Section */}
        {shouldShowRecentSearches && (
          <section className="recent-searches-section">
            <div className="section-header">
              <h2 className="section-title">
                <Clock size={18} className="section-icon" />
                Recent
              </h2>
              <button
                onClick={clearAllRecentSearches}
                className="clear-all-btn"
              >
                Clear all
              </button>
            </div>

            <div className="results-list">
              {recentSearches.map((user: any) => (
                <UserCard
                  key={user.id || user.username || Math.random()}
                  user={user}
                  isFollowing={followingUsers.has(user.id)}
                  isLoading={false}
                  onFollow={handleFollow}
                  onUserClick={handleUserClick}
                  currentUser={currentUser}
                  showRemove={true}
                  onRemove={removeFromRecentSearches}
                />
              ))}
            </div>
          </section>
        )}

        {/* Search Results Section */}
        {(hasSearched || isLoading) && (
          <section className="search-results-section">
            <h2 className="section-title">
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
            ) : shouldShowSearchResults ? (
              <div className="results-list">
                {searchResults.map((user: any) => (
                  <UserCard
                    key={user.id || user.username || Math.random()}
                    user={user}
                    isFollowing={followingUsers.has(user.id)}
                    isLoading={isLoading}
                    onFollow={handleFollow}
                    onUserClick={handleUserClick}
                    currentUser={currentUser}
                  />
                ))}
              </div>
            ) : shouldShowEmptyState ? (
              <div className="card empty-state">
                <div className="empty-icon">
                  <Search size={32} style={{ color: "#9ca3af" }} />
                </div>
                <p className="empty-title">No users found</p>
                <p className="empty-description">
                  Try different search terms or check the format (handle@domain)
                </p>
              </div>
            ) : null}
          </section>
        )}

        {/* Default state when no recent searches and no search performed */}
        {!shouldShowRecentSearches && !hasSearched && (
          <div className="welcome-state">
            <div className="welcome-icon">
              <Search size={48} style={{ color: "#9ca3af" }} />
            </div>
            <h3 className="welcome-title">Search for people</h3>
            <p className="welcome-description">
              Enter a handle in the format: username@domain.com
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchUsersPage;
