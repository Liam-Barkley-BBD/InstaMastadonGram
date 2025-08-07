// services/userSearchService.ts
import type { UserProfile } from "../types";
import { FedifyHandler } from "../fedify/fedify";

class UserSearchService {
  private fedify: FedifyHandler;

  constructor() {
    this.fedify = new FedifyHandler();
  }

  async searchUsers(query: string): Promise<UserProfile[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      // Call your backend search endpoint
      const response = await this.fedify.makeRequest(
        `${import.meta.env.VITE_BACKEND_URL}/api/search/search/users?q=${encodeURIComponent(query)}`,
        {},
        0,
        false
      );

      // Process local and remote results
      let processedResults: UserProfile[] = [];
      
      // Process local results
      if (response.local && response.local.length > 0) {
        for (const localUser of response.local) {
          const profile:any = await this.fedify.getProfile(this.fedify.extractUsername(localUser.handle));
          processedResults.push(profile);
        }
      }  else if (response.remote) {
        const remoteProfile:any = await this.fedify.getProfile(undefined, response.remote.uri);
        processedResults.push(remoteProfile);
      } else if (!response.remote || !(response.local && response.local.length > 0)){
        const profile:any = await this.fedify.getProfile(query);
        processedResults.push(profile);
      } else {
        processedResults = []
      }

      return processedResults;
    } catch (error) {
      console.error("Search failed:", error);
      throw new Error("Failed to search users. Please try again.");
    }
  }

  async followUser(userId: string): Promise<void> {
    try {
      // TODO: Implement the actual follow API call
      await this.fedify.makeRequest(`${this.fedify.EXPRESS_URL}/follow`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      }, 0, false);
    } catch (error) {
      console.error("Follow action failed:", error);
      throw new Error("Failed to follow user. Please try again.");
    }
  }

  async unfollowUser(userId: string): Promise<void> {
    try {
      // TODO: Implement the actual unfollow API call
      await this.fedify.makeRequest(`${this.fedify.EXPRESS_URL}/unfollow`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      }, 0, false);
    } catch (error) {
      console.error("Unfollow action failed:", error);
      throw new Error("Failed to unfollow user. Please try again.");
    }
  }
}

// Create a singleton instance
export const userSearchService = new UserSearchService();