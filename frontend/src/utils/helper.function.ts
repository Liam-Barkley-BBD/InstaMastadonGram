export const actorUrlToHandle = (actorUrl: string) => {
  const url = new URL(actorUrl);
  const hostname = url.hostname;
  const pathSegments = url.pathname
    .split("/")
    .filter((segment) => segment.length > 0);
  const username = pathSegments[1];

  if (!username) {
    console.error("Unable to extract username from URL path");
  }
  return `@${username}@${hostname}`;
};

export function getFediverseHandle(userUrl: string): string | null {
  try {
    const url = new URL(userUrl);

    const pathSegments = url.pathname.split("/");

    const username = pathSegments[pathSegments.length - 1];

    if (!username) {
      console.error("Invalid URL format: Could not extract username.");
      return null;
    }

    const server = url.hostname;

    const fediverseHandle = `${username}@${server}`;

    return fediverseHandle;
  } catch (error) {
    console.error(`Invalid URL provided: ${userUrl}`, error);
    return null;
  }
}
