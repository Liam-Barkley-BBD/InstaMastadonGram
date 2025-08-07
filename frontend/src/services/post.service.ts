import type { Post } from "../types/Post";
import { filterPost } from "../config/contentFilter";
import { stripHtml, extractMediaFromHtml } from "../utils/htmlUtils";

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
  limit: number = 20,
  instance: string
): Promise<PostsResponse> => {
  try {
    const response = await fetch(
      `${backendUrl}/api/posts/fediverse?page=${page}&limit=${limit}&instance=konnect.tevlen.co.za`,
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
    
    const filteredItems = data.items.filter(filterPost);
    
    // Process posts to extract media and strip HTML
    const processedItems = filteredItems.map((post: Post) => {
      const mediaItems = post.mediaItems || [];
      
      // If no mediaItems but legacy imageUrl/videoUrl exist, convert them
      if (mediaItems.length === 0 && (post.imageUrl || post.videoUrl)) {
        if (post.imageUrl) {
          mediaItems.push({ type: 'image', url: post.imageUrl });
        }
        if (post.videoUrl) {
          mediaItems.push({ type: 'video', url: post.videoUrl });
        }
      }
      
      // If still no media items, try to extract from content
      if (mediaItems.length === 0 && post.content) {
        const { images, videos } = extractMediaFromHtml(post.content);
        images.forEach(url => {
          mediaItems.push({ type: 'image', url });
        });
        videos.forEach(url => {
          mediaItems.push({ type: 'video', url });
        });
      }
      
      return {
        ...post,
        content: stripHtml(post.content || ''),
        mediaItems: mediaItems,
        imageUrl: mediaItems.find(item => item.type === 'image')?.url || null,
        videoUrl: mediaItems.find(item => item.type === 'video')?.url || null
      };
    });
    
    return {
      ...data,
      items: processedItems,
      totalItems: processedItems.length
    };
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
