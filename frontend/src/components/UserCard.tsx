import { memo, useCallback, useState } from "react";
import { actorUrlToHandle } from "../utils/helper.function";
import { follow } from "../services/activities.service";
import { UserCheck, UserPlus, Users2 } from "lucide-react";

interface UserCardProps {
  user: any;
  isFollowing: boolean;
  isLoading: boolean;
  onFollow: (userId: string) => void;
  onUserClick: (userId: string) => void;
  currentUser: any;
}

export const UserCard = memo(
  ({
    user,
    isFollowing,
    isLoading,
    onFollow,
    onUserClick,
    currentUser,
  }: UserCardProps) => {
    const [avatarSrc, setAvatarSrc] = useState(
      user.avatar || "/default-avatar.png"
    );

    const handleCardClick = useCallback(() => {
      onUserClick(user.id);
    }, [user.id, onUserClick]);

    const handleFollowClick = useCallback(async () => {
      const currentUserHandle: string = currentUser.handle;
      const actorHandle: string = actorUrlToHandle(user.id);

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
      // Safety check for user URL
      if (!user.url) {
        console.error("User URL is missing");
        return;
      }

      try {
        // Safety check for currentUser
        if (!currentUser?.handle) {
          console.error("Current user handle is missing");
          return;
        }

        // Call the onFollow callback
        onFollow(user.id);
      } catch (error) {
        console.error("Error processing follow action:", error);
      }
    }, [user.url, user.id, currentUser?.handle, onFollow]);

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
      </div>
    );
  }
);

// Add display name for debugging
UserCard.displayName = "UserCard";

UserCard.displayName = "UserCard";
