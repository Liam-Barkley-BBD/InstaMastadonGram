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
router.get('/profile/:handle', async (req, res) => {
    try {
        const { handle } = req.params;
        const profileData = await makeActivityPubRequest(`https://mastodon.social/users/${handle}`);
        res.json(profileData);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user followers
router.get('/followers/:handle', async (req, res) => {
     try {
        const { handle } = req.params;
        const maxPages = parseInt(req.query.maxPages as string) || 5; // Allow limiting pages
        
        const followersData = await getAllPaginatedItems(
            `https://mastodon.social/users/${handle}/followers`,
            maxPages
        );
        
        res.json(followersData);
    } catch (error) {
        console.error('Error fetching followers:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user following
router.get('/following/:handle', async (req, res) => {
     try {
        const { handle } = req.params;
        const maxPages = parseInt(req.query.maxPages as string) || 5; // Allow limiting pages
        
        const followingData = await getAllPaginatedItems(
            `https://mastodon.social/users/${handle}/following`,
            maxPages
        );
        
        res.json(followingData);
    } catch (error) {
        console.error('Error fetching following:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user posts
router.get('/posts/:handle', async (req, res) => {
    try {
        const { handle } = req.params;
        const postsData = await makeActivityPubRequest(`https://mastodon.social/users/${handle}/outbox`);
        res.json(postsData);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: error });
    }
});

const getAllPaginatedItems = async (initialUrl, maxPages = 5) => {
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
