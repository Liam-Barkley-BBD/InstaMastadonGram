import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FedifyHandler } from "../../fedify/fedify";
import { Search } from "lucide-react";
import useAuth from "../../services/user.service";
import { UserCard } from "../../components/UserCard";
import { userSearchService } from "../../fedify/searchUsers";

interface GetFollowersResponse {
  orderedItems: string[];
}

interface HandleWithUrl {
  handle: string;
  url: string;
}

function extractHandlesWithUrls(data: GetFollowersResponse): HandleWithUrl[] {
  return data.orderedItems
    .map((urlString) => {
      try {
        const url = new URL(urlString);
        const domain = url.hostname;
        const pathParts = url.pathname.split("/").filter(Boolean);

        let username = "";
        if (pathParts[0] === "users" && pathParts[1]) {
          username = pathParts[1];
        } else if (pathParts[0].startsWith("@")) {
          username = pathParts[0].slice(1);
        } else {
          username = pathParts[pathParts.length - 1];
        }

        return { handle: `@${username}@${domain}`, url: urlString };
      } catch {
        return null;
      }
    })
    .filter((item): item is HandleWithUrl => item !== null);
}

interface FollowersPageProps {
  isFollowers: boolean;
}

const FollowersPage: React.FC<FollowersPageProps> = ({
  isFollowers = false,
}) => {
  const navigate = useNavigate();
  const { handle } = useParams<{ handle: string }>();
  const [isLoading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [, setError] = useState<string | null>(null);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());

  const handleUserClick = useCallback(
    (userId: string) => {
      const foundUser = searchResults.find((u) => u.id === userId);
      if (foundUser) {
        navigate(`/profile?user=${foundUser.url}`)
      }
    },
    [searchResults, navigate]
  );

  useEffect(() => {
    if (!handle) return;

    const controller = new AbortController();
    const fedify = new FedifyHandler();
    const endpoint = isFollowers ? "followers" : "following";

    const fetchFollowers = async () => {
      setLoading(true);
      setSearchResults([]);

      try {
        const res = (await fedify.getAccountFollowers(
          endpoint,
          encodeURIComponent(handle)
        )) as GetFollowersResponse;

        const handles = extractHandlesWithUrls(res);
        const users: any[] = [];
        const errors: any[] = [];

        for (const h of handles) {
          if (controller.signal.aborted) return;

          try {
            const results = await userSearchService.searchUsers(
              h.handle.slice(1)
            );

            if (results && results.at(0)) {
              const user = results.at(0);
              users.push(user);
              setSearchResults([...users]);
            }
          } catch (err) {
            errors.push(err);
          }
        }
      } catch (err) {
        console.error(err);
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchFollowers();

    return () => {
      controller.abort();
    };
  }, []);

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

  return (
    <div className="page-container">
      <div className="container">
        <header className="header">
          <div>
            <h1>
              {isFollowers
                ? `${handle}'s followers`
                : `People ${handle}'s following`}
            </h1>
          </div>
        </header>

        <section className="mb-8">
          <h2 className="section-title mb-4">
            {isLoading ? "Loading..." : null}
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
              <p className="empty-description">Try different search terms</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default FollowersPage;
