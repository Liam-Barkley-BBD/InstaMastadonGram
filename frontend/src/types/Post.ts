export interface Post {
  id: string;
  content: string;
  publishedDate: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  actor: {
    handle: string;
    name: string;
    id: string;
  };
  url: string;
  likes: number;
  replies: number;
  shares: number;
}
