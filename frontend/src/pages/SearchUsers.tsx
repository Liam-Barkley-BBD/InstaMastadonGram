import { useState, useCallback, useRef } from "react";
import { Search } from "lucide-react";
import { userSearchService } from "../fedify/searchUsers";
import "./styles/SearchUsers.css";
import ProfilePage from "./ProfilePage";
import useAuth from "../services/user.service";
import { UserCard } from "../components/UserCard";

const SearchUsersPage = () => {
  const { user: currentUser } = useAuth();
  const [viewingProfile, setViewingProfile] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousQueryRef = useRef("");

  const isValidHandleFormat = (query: string) => {
    return /^[^@]+@[^@]+$/.test(query.trim());
  };

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
      setHasSearched(false);
      previousQueryRef.current = "";
      return;
    }

    if (!isValidHandleFormat(query)) {
      setError("Search format must be <handle>@<domain>");
      setSearchResults([]);
      return;
    }

    if (query === previousQueryRef.current) return;
    previousQueryRef.current = query;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
   
    try {
      const results = await userSearchService.searchUsers(query);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err) {
      // setError(err instanceof Error ? err.message : "Failed to search users");
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFollow = useCallback(async (userId: string) => {
    const isCurrentlyFollowing = followingUsers.has(userId);
    const userToFollow = searchResults.find(u => u.id === userId);
   
    if (!userToFollow?.url || !currentUser?.handle) {
      setError("Missing required user information");
      return;
    }

    try {
      // Optimistically update UI
      setFollowingUsers(prev => {
        const newSet = new Set(prev);
        isCurrentlyFollowing ? newSet.delete(userId) : newSet.add(userId);
        return newSet;
      });

    } catch {
      setFollowingUsers(prev => {
        const newSet = new Set(prev);
        isCurrentlyFollowing ? newSet.add(userId) : newSet.delete(userId);
        return newSet;
      });
     
      setError(`Failed to ${isCurrentlyFollowing ? "unfollow" : "follow"} user`);
    }
  }, [followingUsers, searchResults, currentUser]);

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
              {currentUser?.handle ? currentUser.handle.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="username">{currentUser?.handle || 'Guest'}</span>
          </div>
        </header>

        <div className="search-container">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users (format: handle@domain)"
              className="search-input"
              aria-label="Search users"
              enterKeyHint="search"
            />
            <button
              onClick={() => searchUsers(searchQuery)}
              className="search-btn"
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

        {hasSearched && (
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
                    currentUser={currentUser}
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