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
    replies?: number;
    shares?: number;
}

interface PaginatedPostsResponse {
    items: Post[];
    totalItems: number;
    hasNextPage: boolean;
    nextPage?: number;
    pagesLoaded: number;
}

export class FedifyHandler {
    API_BASE_URL = "https://mastodon.social"; // Set your Express API URL here
    fedify_headers = {
        "Accept": "application/activity+json",
        "Accept-encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    }

    EXPRESS_URL = `${import.meta.env.VITE_BACKEND_URL}/api/frontend`;

     async makeRequest(
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

    private buildQueryParams(handle?: string, uri?: string): string {
        const params = new URLSearchParams();
        if (handle) params.set('handle', handle);
        if (uri) params.set('uri', uri);
        return params.toString() ? `?${params.toString()}` : '';
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

     extractUsername(handle: string): string {
        if (handle.includes('@')) {
            return handle.split('@')[0];
        }
        return handle;
        }

    extractDomain(handle:string):string {
        if (handle.includes('@')) {
            return handle.split('@')[1];
        }
        return handle;
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

    // Optimized getProfile - now supports both handle and uri
    getProfile = async (handle?: string, uri?: string ): Promise<UserProfile> => {
        if (!handle && !uri) {
            throw new Error("Either handle or uri must be provided.");
        }

        const query = this.buildQueryParams(handle, uri);

        const rawProfile = await this.makeRequest(
            `${this.EXPRESS_URL}/profile${query}`,
            {},
            0,
            false
        );
        
        const profileData: Partial<UserProfile> = {
            id: rawProfile.id,
            username: rawProfile.preferredUsername,
            displayName: rawProfile.name || rawProfile.preferredUsername,
            bio: this.stripHtml(rawProfile.summary || ""),
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

        // Fetch counts and initial posts in parallel
        const [countsData, postsData] = await Promise.allSettled([
            this.getProfileCounts(handle, rawProfile.followers, rawProfile.following, rawProfile.outbox),
            this.getPostsPaginated(handle, uri, 1, 20) // Start with page 1, 20 posts
        ]);

        // Handle counts
        if (countsData.status === 'fulfilled' && countsData.value) {
            profileData.followersCount = countsData.value.followersCount || 0;
            profileData.followingCount = countsData.value.followingCount || 0;
            profileData.postsCount = countsData.value.postsCount || 0;
        }

        // Handle initial posts
        if (postsData.status === 'fulfilled' && postsData.value) {
            profileData.posts = postsData.value.items || [];
        }

        return profileData as UserProfile;
    };

    // New method to get just the counts - now supports both handle and uri
    private getProfileCounts = async (handle?: string, followerUrl?: string, followingUrl?:string, outboxUrl?:string): Promise<{
        followersCount: number;
        followingCount: number;
        postsCount: number;
    }> => {
        try {
            // const query = this.buildQueryParams(handle,  followerUrl,followingUrl,outboxUrl);
             const params = new URLSearchParams();
            if (handle) params.set('handle', handle);
            if (followerUrl) params.set('followerUrl', followerUrl);
            if (followingUrl) params.set('followingUrl', followingUrl);
            if (outboxUrl) params.set('outboxUrl', outboxUrl);
            const query =  params.toString() ? `?${params.toString()}` : ''
            const countsResponse = await this.makeRequest(
                `${this.EXPRESS_URL}/profile/counts${query}`, 
                {}, 0, false
            );
            
            return {
                followersCount: countsResponse.followersCount || 0,
                followingCount: countsResponse.followingCount || 0,
                postsCount: countsResponse.postsCount || 0
            };
        } catch (error) {
            console.warn('Failed to fetch profile counts:', error);
            return { followersCount: 0, followingCount: 0, postsCount: 0 };
        }
    };

    private shuffleArray = <T>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    getFollowingPosts = async (
    handle?: string,
    uri?: string,
    limit: number = 10,
    maxFollowingToFetch: number = 30,
    postsPerUser: number = 3
): Promise<any> => {

    try {
        // Step 1: Get following accounts with pagination if needed
        let allFollowing: Following[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore && allFollowing.length < maxFollowingToFetch) {
            const followingResponse = await this.getFollowingPaginated(handle, uri, page, 50);
            allFollowing.push(...followingResponse.items);
            hasMore = followingResponse.hasNextPage;
            page++;
            
            // Safety break to prevent infinite loops
            if (page > 5) break;
        }


        if (allFollowing.length === 0) {
            return { 
                items: [], 
                totalItems: 0, 
                sources: [],
                fetchedFromUsers: 0,
                totalFollowing: 0
            };
        }

        // Step 2: Shuffle following list and take subset to avoid always fetching from the same users
        const shuffledFollowing = this.shuffleArray(allFollowing).slice(0, maxFollowingToFetch);
        
        // Step 3: Fetch posts with controlled concurrency
        const allPosts: (Post & { sourceUser: string; sourceDisplayName: string })[] = [];
        const sourceCounts: { [key: string]: { count: number; displayName: string; error?: string } } = {};
        let successfulFetches = 0;

        // Process in batches to avoid overwhelming the server
        const batchSize = 5;
        for (let i = 0; i < shuffledFollowing.length; i += batchSize) {
            const batch = shuffledFollowing.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (following) => {
                try {
                    const userPosts = await this.getPostsPaginated(
                        undefined,
                        `${following.id}/outbox?page=true`,
                        1,
                        postsPerUser
                    );

                    
                    if (userPosts.items.length > 0) {
                        const postsWithSource = userPosts.items.map(post => ({
                            ...post,
                            sourceUser: following.username || following.displayName,
                            sourceDisplayName: following.displayName || following.username
                        }));

                        allPosts.push(...postsWithSource);
                        sourceCounts[following.username || following.displayName] = {
                            count: userPosts.items.length,
                            displayName: following.displayName || following.username
                        };
                        successfulFetches++;
                    }
                } catch (error) {
                    console.warn(`Failed to fetch posts for ${following.username}:`, error);
                    sourceCounts[following.username || following.displayName] = {
                        count: 0,
                        displayName: following.displayName || following.username,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                }
            });

            await Promise.all(batchPromises);
            
            // Small delay between batches to be respectful to the server
            if (i + batchSize < shuffledFollowing.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Step 4: Sort by published date (newest first)
        allPosts.sort((a, b) => {
            const dateA = new Date(a.publishedDate).getTime();
            const dateB = new Date(b.publishedDate).getTime();
            return dateB - dateA;
        });

        // Step 5: Take the requested number of posts
        const selectedPosts:any[] = allPosts.slice(0, limit);


        // Step 6: Prepare source information
        const sources = Object.entries(sourceCounts)
            .map(([username, info]) => ({
                username,
                postCount: info.count,
                displayName: info.displayName,
                ...(info.error && { errors: info.error })
            }))
            .sort((a, b) => b.postCount - a.postCount);


return {
  items: selectedPosts
  .filter(post =>
    post.imagecontent !== undefined &&
    post.textcontent !== "undefined"
  )
  .map(post => ({
    id: post.id,
    textcontent: post.textcontent,
    imagecontent: post.imagecontent,
    publishedDate: post.publishedDate,
    url: post.url,
    replies: post.replies,
    shares: post.shares,
    likes: post.likes,
    sourceUser: post.sourceUser,
    sourceDisplayName: post.sourceDisplayName
  })),

  totalItems: allPosts.length,
  sources,
  fetchedFromUsers: successfulFetches,
  totalFollowing: allFollowing.length
};


    } catch (error) {
        console.error('Failed to fetch optimized following posts:', error);
        return { 
            items: [], 
            totalItems: 0, 
            sources: [],
            fetchedFromUsers: 0,
            totalFollowing: 0
        };
    }
};


    // New paginated posts method - now supports both handle and uri
    getPostsPaginated = async (
        handle?: string, 
        uri?: string,
        page: number = 1, 
        limit: number = 10
    ): Promise<PaginatedPostsResponse> => {
        try {
            const baseQuery = this.buildQueryParams(handle, uri);
            const separator = baseQuery ? '&' : '?';

            const fullQuery = baseQuery + separator;

            const postsResponse = await this.makeRequest(
                `${this.EXPRESS_URL}/posts${fullQuery}`, 
                {}, 0, false
            );
            
            const orderedItems = postsResponse.orderedItems || [];
            let posts: Post[] = [];
            
            if (orderedItems.length > 0) {
                if (typeof orderedItems[0] === 'string') {
                    posts = await this.resolveMultiplePosts(orderedItems);
                } else {
                    // Already post objects
                    
                    posts = orderedItems.map((post: any) => ({
                        id: post.id,
                        imagecontent: post.object.attachment,
                        textcontent: this.stripHtml(post.object.content),
                        publishedDate: post.published || post.object?.published,
                        url: post.object?.url || post.url,
                        replies: post.object?.replies?.totalItems || 0,
                        shares: post.object?.shares?.totalItems || 0,
                        likes: post.object?.likes?.totalItems || 0
                    }));
                }
            }

            return {
                items: posts,
                totalItems: postsResponse.totalItems || 0,
                hasNextPage: posts.length === limit && (page * limit) < (postsResponse.totalItems || 0),
                nextPage: posts.length === limit ? page + 1 : undefined,
                pagesLoaded: page
            };
        } catch (error) {
            console.warn('Failed to fetch paginated posts:', error);
            return { 
                items: [], 
                totalItems: 0, 
                hasNextPage: false, 
                pagesLoaded: 0 
            };
        }
    };

    // Method to load followers when needed - now supports both handle and uri
    getFollowersPaginated = async (
        handle?: string, 
        uri?: string,
        page: number = 1, 
        limit: number = 50
    ): Promise<{
        items: Follower[];
        totalItems: number;
        hasNextPage: boolean;
        nextPage?: number;
    }> => {
        try {
            const baseQuery = this.buildQueryParams(handle, uri);
            const separator = baseQuery ? '&' : '?';
            const paginationQuery = `page=${page}&limit=${limit}`;
            const fullQuery = baseQuery + separator + paginationQuery;

            const followersResponse = await this.makeRequest(
                `${this.EXPRESS_URL}/followers${fullQuery}`, 
                {}, 0, false
            );
            
            const orderedItems = followersResponse.orderedItems || [];
            let followers: Follower[] = [];
            
            if (orderedItems.length > 0) {
                if (typeof orderedItems[0] === 'string') {
                    followers = await this.resolveMultipleUsers(orderedItems);
                } else {
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
                items: followers,
                totalItems: followersResponse.totalItems || 0,
                hasNextPage: followers.length === limit && (page * limit) < (followersResponse.totalItems || 0),
                nextPage: followers.length === limit ? page + 1 : undefined
            };
        } catch (error) {
            console.warn('Failed to fetch paginated followers:', error);
            return { items: [], totalItems: 0, hasNextPage: false };
        }
    };

    // Method to load following when needed - now supports both handle and uri
    getFollowingPaginated = async (
        handle?: string, 
        uri?: string,
        page: number = 1, 
        limit: number = 50
    ): Promise<{
        items: Following[];
        totalItems: number;
        hasNextPage: boolean;
        nextPage?: number;
    }> => {
        try {
            const baseQuery = this.buildQueryParams(handle, uri);
            const separator = baseQuery ? '&' : '?';
            const paginationQuery = `page=${page}&limit=${limit}`;
            const fullQuery = baseQuery + separator + paginationQuery;

            const followingResponse = await this.makeRequest(
                `${this.EXPRESS_URL}/following${fullQuery}`, 
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
                items: following,
                totalItems: followingResponse.totalItems || 0,
                hasNextPage: following.length === limit && (page * limit) < (followingResponse.totalItems || 0),
                nextPage: following.length === limit ? page + 1 : undefined
            };
        } catch (error) {
            console.warn('Failed to fetch paginated following:', error);
            return { items: [], totalItems: 0, hasNextPage: false };
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
                likes: postObject.object?.likes?.totalItems || postObject.likes?.totalItems || 0,
                replies: postObject.object?.replies?.totalItems || 0,
                shares: postObject.object?.shares?.totalItems || 0
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

    // Follow/unfollow methods updated to support both handle and uri
    followUser = async (handle?: string, uri?: string) => {
        if (!handle && !uri) {
            throw new Error("Either handle or uri must be provided.");
        }
        
        const query = this.buildQueryParams(handle, uri);
        return this.makeRequest(`${this.API_BASE_URL}/users/following${query}`, {
            method: "POST",
        }, 0);
    };

    unfollowUser = async (handle?: string, uri?: string) => {
        if (!handle && !uri) {
            throw new Error("Either handle or uri must be provided.");
        }
        
        const query = this.buildQueryParams(handle, uri);
        return this.makeRequest(`${this.API_BASE_URL}/users/unfollow${query}`, {
            method: "DELETE",
        }, 0);
    };

    searchUsers = async (searchText: string) => {
        return this.makeRequest(`${this.API_BASE_URL}/users/search?query=${encodeURIComponent(searchText)}`, {}, 0);
    };

    // Create post method updated to support both handle and uri
    createPost = async (content: string, handle?: string, uri?: string) => {
        if (!handle && !uri) {
            throw new Error("Either handle or uri must be provided.");
        }
        
        const query = this.buildQueryParams(handle, uri);
        return this.makeRequest(`${this.EXPRESS_URL}/posts${query}`, {
            method: "POST",
            body: JSON.stringify({ content }),
        }, 0, false);
    }

    // Check following status updated to support both handle and uri
    isFollowing = async (handle?: string, uri?: string) => {
        if (!handle && !uri) {
            throw new Error("Either handle or uri must be provided.");
        }
        
        try {
            const query = this.buildQueryParams(handle, uri);
            const following = await this.makeRequest(`${this.API_BASE_URL}/users/following${query}`, {}, 0, true);
            const targetHandle = handle || this.extractUsernameFromUrl(uri!);
            return following.some((user: any) => user.handle === targetHandle || user.url === uri);
        } catch (error) {
            console.warn('Failed to check following status:', error);
            return false;
        }
    }
}