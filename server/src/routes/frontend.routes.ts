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
        const followersData = await makeActivityPubRequest(`https://mastodon.social/users/${handle}/followers`);
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
        const followingData = await makeActivityPubRequest(`https://mastodon.social/users/${handle}/following`);
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
        res.status(500).json({ error: error.message });
    }
});

export default router;
