export const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, "");
};

// Utility function to extract media URLs from HTML
export const extractMediaFromHtml = (html: string): { images: string[], videos: string[] } => {
  const images: string[] = [];
  const videos: string[] = [];
  
  // Extract image URLs using regex
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;
  
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    images.push(match[1]);
  }
  while ((match = videoRegex.exec(html)) !== null) {
    videos.push(match[1]);
  }
  
  return { images, videos };
};