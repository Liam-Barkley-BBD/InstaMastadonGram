// Regular expression to match URLs
const URL_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  domain: string;
}

export const extractLinks = (text: string): string[] => {
  const matches = text.match(URL_REGEX);
  return matches || [];
};

export const getDomain = (url: string): string => {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return domain;
  } catch {
    return url;
  }
};

export const fetchLinkPreview = async (
  url: string
): Promise<LinkPreview | null> => {
  try {
    // For now, we'll create a simple preview based on the URL
    // In a real implementation, you'd want to fetch the actual page metadata
    const domain = getDomain(url);

    return {
      url,
      domain,
      title: `Link to ${domain}`,
      description: `Visit ${domain} for more information`,
    };
  } catch (error) {
    console.error("Error fetching link preview:", error);
    return null;
  }
};
