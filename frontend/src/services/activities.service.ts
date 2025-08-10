import { post } from "../utils/fetch.function"

type FollowDetails = {
  actorHandle: string,
  userName: string,
  activity: string,
}

export async function follow(followDetails: FollowDetails) {
  if(!followDetails) return 'Please provide follow details';

  try {
    const backendUrl: string = import.meta.env.VITE_BACKEND_URL;
    const followResponse = await post(`${backendUrl}/api/users/${followDetails.userName}/activity`, JSON.stringify({ handle: followDetails.actorHandle, activity: followDetails.activity }));
    const follow = await followResponse.json();
    return follow;
  } catch(error) {
    return error;
  } finally {
    return followDetails.activity.toLowerCase() === "follow" 
    ? `You have succefully followed ${followDetails.actorHandle}`
    : `You have succefully unfollowed ${followDetails.actorHandle}`;
  }
  
}