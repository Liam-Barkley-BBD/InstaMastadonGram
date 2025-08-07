const URL_REGEX =
  /(https?:\/\/|ftp:\/\/|mailto:|tel:)[^\s<>"'(){}[\]]+|(?:www\.[^\s<>"'(){}[\]]+)|(?:[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s<>"'(){}[\]]*)/gi;
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
