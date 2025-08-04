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

    private async resolveUserFromUrl(userUrl: string): Promise<Follower | Following | null> {
        try {
            const userObject = await this.makeRequest(userUrl, {}, 0, true);
            
            return {
                id: userObject.id,
                username: userObject.preferredUsername || this.extractUsernameFromUrl(userUrl),
                displayName: userObject.name || userObject.preferredUsername || this.extractUsernameFromUrl(userUrl),
                url: userObject.url || userUrl,
                avatar: userObject.icon?.url
            };
        } catch (error) {
            console.warn(`Failed to resolve user from URL ${userUrl}:`, error);
            const username = this.extractUsernameFromUrl(userUrl);
            return {
                id: userUrl,
                username: username,
                displayName: username,
                url: userUrl,
                avatar: undefined
            };
        }
    }

    private extractUsernameFromUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(part => part);
            
            if (pathParts.includes('users') && pathParts.length > 1) {
                const userIndex = pathParts.indexOf('users');
                return pathParts[userIndex + 1] || 'unknown';
            }
            // Handle @username format
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart?.startsWith('@')) {
                return lastPart.substring(1);
            }
            
            return lastPart || 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    private async resolveMultipleUsers(userUrls: string[], maxConcurrent: number = 5): Promise<(Follower | Following)[]> {
        const results: (Follower | Following)[] = [];
        
        for (let i = 0; i < userUrls.length; i += maxConcurrent) {
            const batch = userUrls.slice(i, i + maxConcurrent);
            const batchPromises = batch.map(url => this.resolveUserFromUrl(url));
            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    results.push(result.value);
                }
            });
        }
        
        return results;
    }

    getLoggedInUser = async () => {
        return this.makeRequest(`${this.API_BASE_URL}/user`, {}, 0);
    };

    getProfile = async (handle: string): Promise<UserProfile> => {
        const rawProfile = await this.makeRequest(`${this.EXPRESS_URL}/profile/${handle}`, {}, 0, false);
        
        const profileData: Partial<UserProfile> = {
            id: rawProfile.id,
            username: rawProfile.preferredUsername,
            displayName: rawProfile.name || rawProfile.preferredUsername,
            bio: rawProfile.summary || "",
            url: rawProfile.url,
            avatar: rawProfile.icon?.url,
            publishedDate: rawProfile.published,
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
            console.log('Raw followers response:', followersResponse);
            
            // Check if orderedItems contains URLs (strings) or objects
            const orderedItems = followersResponse.orderedItems || [];
            let followers: Follower[] = [];
            
            if (orderedItems.length > 0) {
                if (typeof orderedItems[0] === 'string') {
                    followers = await this.resolveMultipleUsers(orderedItems);
                } else {
                    // Already user objects
                    followers = orderedItems.map((follower: any) => ({
                        id: follower.id,
                        username: follower.preferredUsername || follower.name?.split('@')[0],
                        displayName: follower.name || follower.preferredUsername,
                        url: follower.url || follower.id,
                        avatar: follower.icon?.url
                    }));
                }
            }

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
            
            const orderedItems = followingResponse.orderedItems || [];
            let following: Following[] = [];
            
            if (orderedItems.length > 0) {
                if (typeof orderedItems[0] === 'string') {
                    following = await this.resolveMultipleUsers(orderedItems);
                } else {
                    following = orderedItems.map((person: any) => ({
                        id: person.id,
                        username: person.preferredUsername || person.name?.split('@')[0],
                        displayName: person.name || person.preferredUsername,
                        url: person.url || person.id,
                        avatar: person.icon?.url
                    }));
                }
            }

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

    private getPostsProxy = async (handle: string, maxPages: number = 10): Promise<any> => {
        try {
            const postsResponse = await this.makeRequest(
                `${this.EXPRESS_URL}/posts/${handle}?maxPages=${maxPages}`, 
                {}, 0, false
            );
            console.log('Raw posts response:', postsResponse);
            
            const orderedItems = postsResponse.orderedItems || [];
            let posts: Post[] = [];
            
            if (orderedItems.length > 0) {
                if (typeof orderedItems[0] === 'string') {
                    posts = await this.resolveMultiplePosts(orderedItems);
                } else {
                    // Already post objects
                    posts = orderedItems.map((post: any) => ({
                        id: post.id,
                        content: this.stripHtml(post.object?.content || post.content ||"") || post.object.attachment ,
                        publishedDate: post.published || post.object?.published,
                        url: post.object?.url || post.url,
                        replies: post.object?.replies?.totalItems || 0,
                        shares: post.object?.shares?.totalItems || 0,
                        likes: post.object?.likes?.totalItems || 0
                    }));
                }
            }

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

    private async resolveMultiplePosts(postUrls: string[], maxConcurrent: number = 5): Promise<Post[]> {
        const results: Post[] = [];
        
        for (let i = 0; i < postUrls.length; i += maxConcurrent) {
            const batch = postUrls.slice(i, i + maxConcurrent);
            const batchPromises = batch.map(url => this.resolvePostFromUrl(url));
            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    results.push(result.value);
                }
            });
        }
        
        return results;
    }

    private async resolvePostFromUrl(postUrl: string): Promise<Post | null> {
        try {
            const postObject = await this.makeRequest(postUrl, {}, 0, true);
            
            return {
                id: postObject.id,
                content: this.stripHtml(postObject.object?.content || postObject.content || ""),
                publishedDate: postObject.published || postObject.object?.published,
                url: postObject.object?.url || postObject.url || postUrl,

                likes: postObject.object?.likes?.totalItems || postObject.likes?.totalItems || 0
            };
        } catch (error) {
            console.warn(`Failed to resolve post from URL ${postUrl}:`, error);
            return null;
        }
    }

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