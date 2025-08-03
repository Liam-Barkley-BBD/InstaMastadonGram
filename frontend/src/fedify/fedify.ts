// Define interfaces for type safety
interface UserProfile {
    id: string;
    username: string;
    displayName: string;
    bio: string;
    url: string;
    avatar?: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    followers: Follower[];
    following: Following[];
    posts: Post[];
    publishedDate: string;
    discoverable: boolean;
}

interface Follower {
    id: string;
    username: string;
    displayName: string;
    url: string;
    avatar?: string;
}

interface Following {
    id: string;
    username: string;
    displayName: string;
    url: string;
    avatar?: string;
}

interface Post {
    id: string;
    content: string;
    publishedDate: string;
    url: string;
    replies?: number;
    shares?: number;
    likes?: number;
}

export class FedifyHandler {
    API_BASE_URL = "https://mastodon.social"; // Set your Express API URL here
    fedify_headers = {
        "Accept": "application/activity+json",
        "Accept-encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    }

    EXPRESS_URL = "http://localhost:8000/api/frontend";

    private async makeRequest(
        url: string,
        options: RequestInit = {},
        retryCount = 0,
        fedifyHeaders?: boolean,
    ): Promise<any> {
        const defaultHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        const requestOptions: RequestInit = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {}),
                ...(fedifyHeaders ? this.fedify_headers : {}),
            }
        };

        try {
            const res = await fetch(url, requestOptions);
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return await res.json();
        } catch (error) {
            if (retryCount < 3) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                return this.makeRequest(url, options, retryCount + 1, fedifyHeaders);
            }
            throw error;
        }
    }

    getLoggedInUser = async () => {
        return this.makeRequest(`${this.API_BASE_URL}/user`, {}, 0);
    };

    getProfile = async (handle: string): Promise<UserProfile> => {
        // Get the main profile data through Express proxy
        const rawProfile = await this.makeRequest(`${this.EXPRESS_URL}/profile/${handle}`, {}, 0, false);
        
        // Parse the basic profile info
        const profileData: Partial<UserProfile> = {
            id: rawProfile.id,
            username: rawProfile.preferredUsername,
            displayName: rawProfile.name || rawProfile.preferredUsername,
            bio: rawProfile.summary || "",
            url: rawProfile.url,
            avatar: rawProfile.icon?.url,
            publishedDate: rawProfile.published,
            discoverable: rawProfile.discoverable || false,
            followers: [],
            following: [],
            posts: [],
            followersCount: 0,
            followingCount: 0,
            postsCount: 0
        };

        // Fetch additional data in parallel through Express proxy
        const [followersData, followingData, postsData] = await Promise.allSettled([
            this.getFollowersProxy(handle),
            this.getFollowingProxy(handle),
            this.getPostsProxy(handle)
        ]);

        // Handle followers
        if (followersData.status === 'fulfilled' && followersData.value) {
            profileData.followers = followersData.value.items || [];
            profileData.followersCount = followersData.value.totalItems || profileData?.followers?.length;
        }

        // Handle following
        if (followingData.status === 'fulfilled' && followingData.value) {
            profileData.following = followingData.value.items || [];
            profileData.followingCount = followingData.value.totalItems || profileData?.following?.length;
        }

        // Handle posts
        if (postsData.status === 'fulfilled' && postsData.value) {
            profileData.posts = postsData.value.items || [];
            profileData.postsCount = postsData.value.totalItems || profileData?.posts?.length;
        }

        return profileData as UserProfile;
    };

    // Helper methods that use Express proxy to avoid CORS
    private getFollowersProxy = async (handle: string, maxPages: number = 5): Promise<any> => {
        try {
            const followersResponse = await this.makeRequest(
                `${this.EXPRESS_URL}/followers/${handle}?maxPages=${maxPages}`, 
                {}, 0, false
            );
            
            // Parse followers into clean format
            const followers = followersResponse.orderedItems?.map((follower: any) => ({
                id: follower.id,
                username: follower.preferredUsername || follower.name?.split('@')[0],
                displayName: follower.name || follower.preferredUsername,
                url: follower.url || follower.id,
                avatar: follower.icon?.url
            })) || [];

            return {
                totalItems: followersResponse.totalItems || 0,
                items: followers,
                pagesLoaded: followersResponse.pagesLoaded || 0
            };
        } catch (error) {
            console.warn('Failed to fetch followers:', error);
            return { totalItems: 0, items: [], pagesLoaded: 0 };
        }
    };

    private getFollowingProxy = async (handle: string, maxPages: number = 5): Promise<any> => {
        try {
            const followingResponse = await this.makeRequest(
                `${this.EXPRESS_URL}/following/${handle}?maxPages=${maxPages}`, 
                {}, 0, false
            );
            
            // Parse following into clean format
            const following = followingResponse.orderedItems?.map((person: any) => ({
                id: person.id,
                username: person.preferredUsername || person.name?.split('@')[0],
                displayName: person.name || person.preferredUsername,
                url: person.url || person.id,
                avatar: person.icon?.url
            })) || [];

            return {
                totalItems: followingResponse.totalItems || 0,
                items: following,
                pagesLoaded: followingResponse.pagesLoaded || 0
            };
        } catch (error) {
            console.warn('Failed to fetch following:', error);
            return { totalItems: 0, items: [], pagesLoaded: 0 };
        }
    };

    private getPostsProxy = async (handle: string, maxPages: number = 3): Promise<any> => {
        try {
            const postsResponse = await this.makeRequest(
                `${this.EXPRESS_URL}/posts/${handle}?maxPages=${maxPages}`, 
                {}, 0, false
            );
            
            // Parse posts into clean format
            const posts = postsResponse.orderedItems?.map((post: any) => ({
                id: post.id,
                content: this.stripHtml(post.object?.content || post.content || ""),
                publishedDate: post.published || post.object?.published,
                url: post.object?.url || post.url,
                replies: post.object?.replies?.totalItems || 0,
                shares: post.object?.shares?.totalItems || 0,
                likes: post.object?.likes?.totalItems || 0
            })) || [];

            return {
                totalItems: postsResponse.totalItems || 0,
                items: posts,
                pagesLoaded: postsResponse.pagesLoaded || 0
            };
        } catch (error) {
            console.warn('Failed to fetch posts:', error);
            return { totalItems: 0, items: [], pagesLoaded: 0 };
        }
    };

    // Helper method to strip HTML from content
    private stripHtml = (html: string): string => {
        if (typeof document !== 'undefined') {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        } else {
            // Fallback for server-side or when document is not available
            return html.replace(/<[^>]*>/g, '');
        }
    };

    followUser = async (handle: string) => {
        return this.makeRequest(`${this.API_BASE_URL}/users/${handle}/follow`, {
            method: "POST",
        }, 0);
    };

    unfollowUser = async (handle: string) => {
        return this.makeRequest(`${this.API_BASE_URL}/users/${handle}/unfollow`, {
            method: "DELETE",
        }, 0);
    };

    searchUsers = async (searchText: string) => {
        return this.makeRequest(`${this.API_BASE_URL}/users/search?query=${encodeURIComponent(searchText)}`, {}, 0);
    };

    createPost = async (content: string, handle: string) => {
        return this.makeRequest(`${this.EXPRESS_URL}/posts/${handle}`, {
            method: "POST",
            body: JSON.stringify({ content }),
        }, 0, false);
    }

    isFollowing = async (handle: string) => {
        try {
            const following = await this.makeRequest(`${this.API_BASE_URL}/users/${handle}/following`, {}, 0, true);
            return following.some((user: any) => user.handle === handle);
        } catch (error) {
            console.warn('Failed to check following status:', error);
            return false;
        }
    }
}