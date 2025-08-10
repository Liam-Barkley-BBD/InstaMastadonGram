import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { GetFollowersResponse } from "../../types";
import { FedifyHandler } from "../../fedify/fedify";

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

const FollowersPage: React.FC<FollowersPageProps> = ({isFollowers= false}) => {
  const { handle } = useParams<{ handle: string }>();
  const [followers, setFollowers] = useState<HandleWithUrl[]>([]);
  const [loading, setLoading] = useState(true);

  const fedify = new FedifyHandler();
  const endpoint = isFollowers ? "followers" : "following";
  useEffect(() => {
    if (!handle) return;

    const fetchFollowers = async () => {
      try { 
        const res = await fedify.getAccountFollowers(endpoint, encodeURIComponent(handle)) as GetFollowersResponse;
        setFollowers(extractHandlesWithUrls(res));
      } catch (err) {
        console.error(err);
        setFollowers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowers();
  }, []);

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h1>{isFollowers? "Followers" : "Following"} {handle}</h1>
      {loading ? (
        <p>Loading...</p>
      ) : followers.length === 0 ? (
        <p>No followers found.</p>
      ) : (
        <ul>
          {followers.map((follower, index) => (
            <li key={index} style={{ padding: "0.25rem 0" }}>
              <a
                href={follower.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", color: "blue" }}
              >
                {follower.handle}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FollowersPage;
