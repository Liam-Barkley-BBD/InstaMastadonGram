import { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  UserCheck,
  MapPin,
  Users2,
  Verified,
} from "lucide-react";
import type { UserProfile } from "../types";

import "./styles/SearchUsers.css";

const mockUsers = [
  {
    id: 1,
    username: "alexadventures",
    displayName: "Alexandra Smith",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b15c2177?w=150&h=150&fit=crop&crop=face",
    verified: true,
    followers: "12.5K",
    following: "892",
    posts: "234",
    bio: "Adventure photographer • World traveler ✈️",
    location: "San Francisco, CA",
    mutualFriends: 5,
    isOnline: true,
  },
  {
    id: 2,
    username: "foodie_marcus",
    displayName: "Marcus Chen",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    verified: false,
    followers: "8.2K",
    following: "1.2K",
    posts: "456",
    bio: "Chef & Food Blogger 🍜 Sharing culinary adventures",
    location: "New York, NY",
    mutualFriends: 12,
    isOnline: false,
  },
  {
    id: 3,
    username: "nature_sarah",
    displayName: "Sarah Johnson",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    verified: false,
    followers: "5.8K",
    following: "543",
    posts: "189",
    bio: "Nature lover 🌿 Wildlife photographer",
    location: "Portland, OR",
    mutualFriends: 3,
    isOnline: true,
  },
  {
    id: 4,
    username: "techguru_dev",
    displayName: "David Park",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    verified: true,
    followers: "15.3K",
    following: "234",
    posts: "567",
    bio: "Software Engineer • Tech Enthusiast 💻",
    location: "Seattle, WA",
    mutualFriends: 8,
    isOnline: false,
  },
  {
    id: 5,
    username: "artist_emma",
    displayName: "Emma Wilson",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    verified: false,
    followers: "3.4K",
    following: "678",
    posts: "123",
    bio: "Digital Artist 🎨 Creating magic pixel by pixel",
    location: "Los Angeles, CA",
    mutualFriends: 2,
    isOnline: true,
  },
];

const SearchUsersPage = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsLoading(true);
      // Simulate API call delay
      const timer = setTimeout(() => {
        const filtered = mockUsers.filter(
          (user) =>
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered);
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleFollow = (userId: number) => {
    setFollowingUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const UserCard = ({
    user,
    isCompact = false,
  }: {
    user: UserProfile;
    isCompact?: boolean;
  }) => (
    <div className="card">
      <div className="user-card-content">
        <div className="user-info-section">
          <div className="avatar-container">
            <img
              src={user.avatar}
              alt={user.username}
              className="user-avatar-large"
            />
            {user.isOnline && <div className="online-indicator"></div>}
          </div>

          <div className="user-details">
            <div className="user-name-row">
              <h3 className="user-display-name">{user.displayName}</h3>
              {user.verified && (
                <Verified className="verified-icon" size={16} />
              )}
            </div>
            <p className="username-text">@{user.username}</p>

            {!isCompact && (
              <>
                <p className="user-bio">{user.bio}</p>

                <div className="user-stats">
                  <span className="stat-item">
                    <Users2 size={12} className="stat-icon" />
                    {user.followers} followers
                  </span>
                  <span>{user.posts} posts</span>
                  {user.mutualFriends > 0 && (
                    <span className="mutual-friends">
                      {user.mutualFriends} mutual friends
                    </span>
                  )}
                </div>

                {user.location && (
                  <div className="location-info">
                    <MapPin size={12} className="location-icon" />
                    {user.location}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => handleFollow(user.id)}
          className={`follow-btn ${
            followingUsers.has(user.id)
              ? "follow-btn-following"
              : "follow-btn-follow"
          }`}
        >
          {followingUsers.has(user.id) ? (
            <UserCheck size={16} />
          ) : (
            <UserPlus size={16} />
          )}
          {followingUsers.has(user.id) ? "Following" : "Follow"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="container">
        {/* Header */}
        <div className="header">
          <div>
            <h1>Discover People</h1>
            <p>Find and connect with amazing people</p>
          </div>
          <div className="user-info">
            <div className="user-avatar">U</div>
            <span className="username">@username</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name or username..."
              className="search-input"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="mb-8">
            <h2 className="section-title mb-4">
              {isLoading
                ? "Searching..."
                : `Search Results (${searchResults.length})`}
            </h2>

            {isLoading ? (
              <div className="results-list">
                {[1, 2, 3].map((i) => (
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
                    <UserCard user={user} />
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
                  Try searching with different keywords
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchUsersPage;
