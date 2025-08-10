import type { UserProfile } from "../config/passport.ts";
import crypto from "crypto";

type ActivityDetails = {
  actor: string,
  object: string,
  domain: string,
  username: string,
  type: string
}

export const getUserHandle = (userProfile: UserProfile): string | undefined => {
  if(!userProfile) return;
  const baseHandle = userProfile.email.split('@')[0];
  return `${baseHandle.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}_${userProfile.sub.slice(-7)}`;
}

export const createActivityId = (activityDetails: ActivityDetails): URL => {
  const followActivity = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: activityDetails.type,
    actor: activityDetails.actor,
    object: activityDetails.object
  };
  const hash = crypto.createHash('sha256').update(JSON.stringify(followActivity)).digest('hex');
  return new URL(`${activityDetails.domain}/${activityDetails.username}#${activityDetails.type}/${hash}`);
}

export const extractUsernameAndDomain = (handle: string): {
  username: string,
  domain: string
} | null => {
  const match = handle.match(/^@?([^@]+)@([^@]+)$/);
  if (match) {
    return {
      username: match[1],
      domain: match[2]
    };
  }
  return null;
}
