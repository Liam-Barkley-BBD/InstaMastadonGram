export interface MediaItem {
  type: 'image' | 'video';
  url: string;
}

export interface Post {
  id: string;
  content: string;
  publishedDate: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  mediaItems?: MediaItem[];
  actor: {
    handle: string;
    name: string;
    id: string;
    domain?: string;
  };
  url: string;
  likes: number;
  replies: number;
  shares: number;
  instance?: string;
  sensitive?: boolean;
}
