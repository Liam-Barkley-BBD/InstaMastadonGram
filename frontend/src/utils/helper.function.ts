export const actorUrlToHandle = (actorUrl: string) => {
  const url = new URL(actorUrl);
  const hostname = url.hostname;
  const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0);
  const username = pathSegments[1];
  
  if (!username) {
    throw new Error('Unable to extract username from URL path');
  }
  return `@${username}@${hostname}`;
}