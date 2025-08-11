import { Router } from "express";

const router = Router();

const makeActivityPubRequest = async (url:any) => {
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/activity+json',
            'Accept-encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'User-Agent': 'YourApp/1.0'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
};

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const { handle, uri } = req.query;
        const profileData = await makeActivityPubRequest(uri??`https://mastodon.social/users/${handle}`);
        res.json(profileData);
    } catch (error: any) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user followers
router.get('/followers', async (req, res) => {
     try {
        const { handle, uri } = req.query;
        const maxPages = parseInt(req.query.maxPages as string) || 5; // Allow limiting pages
        
        const followersData = await getAllPaginatedItems(
            uri??`https://mastodon.social/users/${handle}/followers`,
            maxPages
        );
        
        res.json(followersData);
    } catch (error: any) {
        console.error('Error fetching followers:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user following
router.get('/following', async (req, res) => {
   try {
     const { handle, uri } = req.query;
     const maxPages = parseInt(req.query.maxPages as string) || 5;

     const initialUri =
       uri || `https://mastodon.social/users/${handle}/following`;

     if (!handle && !uri) {
       return res
         .status(400)
         .json({ error: "Missing `handle` or `uri` parameter." });
     }

     const followingData = await getAllPaginatedItems(initialUri, maxPages);

     res.json(followingData);
   } catch (error) {
     console.error("Error fetching following:", error);
     res.status(500).json({ error: "Failed to fetch following data." });
   }
});

// Get user posts
router.get('/posts', async (req, res) => {
    try {
        const { handle, uri } = req.query;
        const postsData = await makeActivityPubRequest(uri??`https://mastodon.social/users/${handle}/outbox?page=true`);
        res.json(postsData);
    } catch (error: any) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/profile/counts', async (req, res) => {
    try {
        const { handle, followerUrl, followingUrl, outboxUrl } = req.query;
        
        // Fetch all count endpoints in parallel
        const [followersResponse, followingResponse, postsResponse] = await Promise.allSettled([
            makeActivityPubRequest(followerUrl??`https://mastodon.social/users/${handle}/followers`),
            makeActivityPubRequest(followingUrl??`https://mastodon.social/users/${handle}/following`),
            makeActivityPubRequest(outboxUrl??`https://mastodon.social/users/${handle}/outbox`)
        ]);
        
        const counts = {
            followersCount: 0,
            followingCount: 0,
            postsCount: 0
        };
        
        // Extract follower count
        if (followersResponse.status === 'fulfilled' && followersResponse.value) {
            counts.followersCount = followersResponse.value.totalItems || 0;
        }
        
        // Extract following count
        if (followingResponse.status === 'fulfilled' && followingResponse.value) {
            counts.followingCount = followingResponse.value.totalItems || 0;
        }
        
        // Extract posts count
        if (postsResponse.status === 'fulfilled' && postsResponse.value) {
            counts.postsCount = postsResponse.value.totalItems || 0;
        }
        
        res.json(counts);
    } catch (error: any) {
        console.error('Error fetching profile counts:', error);
        res.status(500).json({ error: error.message });
    }
});

const getAllPaginatedItems = async (initialUrl: any, maxPages: number = 5) => {
    const allItems = [];
    let currentUrl = initialUrl;
    let pageCount = 0;
    let totalItems = 0;

    while (currentUrl && pageCount < maxPages) {
        try {
            const data = await makeActivityPubRequest(currentUrl);
            
            // Handle different response structures
            if (data.type === 'OrderedCollection') {
                totalItems = data.totalItems || 0;
                // Get the first page URL
                currentUrl = data.first;
                continue;
            } else if (data.type === 'OrderedCollectionPage') {
                // This is a page with actual items
                if (data.orderedItems && Array.isArray(data.orderedItems)) {
                    allItems.push(...data.orderedItems);
                }
                currentUrl = data.next; // Get next page URL
                pageCount++;
            } else {
                // Handle other structures
                if (data.orderedItems && Array.isArray(data.orderedItems)) {
                    allItems.push(...data.orderedItems);
                }
                break;
            }
        } catch (error) {
            console.error('Error fetching paginated data:', error);
            break;
        }
    }

    return {
        totalItems: totalItems || allItems.length,
        orderedItems: allItems,
        pagesLoaded: pageCount
    };
};

export default router;
