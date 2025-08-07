/**
 * Strips HTML tags from a string and returns plain text
 * @param html - The HTML string to strip
 * @returns Plain text without HTML tags
 */
export const stripHtml = (html: string): string => {
  if (typeof document !== "undefined") {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  } else {
    return html.replace(/<[^>]*>/g, "");
  }
};

/**
 * Extracts media URLs from HTML content
 * @param html - The HTML string to extract media from
 * @returns Object containing arrays of image and video URLs
 */
export const extractMediaFromHtml = (
  html: string
): { images: string[]; videos: string[] } => {
  const images: string[] = [];
  const videos: string[] = [];

  if (typeof document !== "undefined") {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;

    const imgElements = tmp.querySelectorAll("img");
    imgElements.forEach((img) => {
      const src = img.getAttribute("src");
      if (src) images.push(src);
    });

    const videoElements = tmp.querySelectorAll("video");
    videoElements.forEach((video) => {
      const src = video.getAttribute("src");
      if (src) videos.push(src);
    });
  } else {
    // Fallback for server-side using regex
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;

    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      images.push(match[1]);
    }
    while ((match = videoRegex.exec(html)) !== null) {
      videos.push(match[1]);
    }
  }

  return { images, videos };
};
