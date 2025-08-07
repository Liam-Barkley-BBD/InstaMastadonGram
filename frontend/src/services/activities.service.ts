import { post } from "../utils/fetch.function"

type FollowDetails = {
  actorHandle: string,
  userName: string,
  activity: string,
}

export async function follow(followDetails: FollowDetails) {
  try {
    const backendUrl: string = import.meta.env.VITE_BACKEND_URL;
    const followResponse = await post(`${backendUrl}/api/users/${followDetails.userName}/follow`, JSON.stringify({ actor: followDetails.actorHandle }));
    const follow = await followResponse.json();
    return follow;
  } catch(error) {
    return error;
  } finally {
    return "Done with follow";
  }
  
}