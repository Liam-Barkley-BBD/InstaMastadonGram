import type { Post } from "../types/Post";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export interface PostsResponse {
  items: Post[];
  totalItems: number;
  hasNextPage: boolean;
  nextPage?: number;
  pagesLoaded: number;
}

export const fetchAllPosts = async (
  page: number = 1,
  limit: number = 20
): Promise<PostsResponse> => {
  try {
    const response = await fetch(
      `${backendUrl}/api/posts/all?page=${page}&limit=${limit}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  }
};

export const formatTimestamp = (publishedDate: string): string => {
  const date = new Date(publishedDate);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
};
