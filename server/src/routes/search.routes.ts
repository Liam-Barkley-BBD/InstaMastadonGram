import { Router } from "express";
import Actor from "../models/actor.model.ts";
import type { ActorDoc } from "../models/actor.model.ts";
import { client as mongoClient } from "../utils/mongo.ts";
import { redisClient } from "../utils/redis.ts"; // We'll create this
import mongoose from "mongoose";

const router = Router();

// Recent searches configuration
const RECENT_SEARCHES_CONFIG = {
    MAX_SEARCHES: 10,
    KEY_PREFIX: 'recent_searches:'
};

// Helper function to get user's recent searches key
const getUserRecentSearchesKey = (userId: string) => {
    return `${RECENT_SEARCHES_CONFIG.KEY_PREFIX}${userId}`;
};

// Helper function to safely use Redis (with fallback)
const safeRedisOperation = async <T>(
    operation: () => Promise<T>,
    fallback: T
): Promise<T> => {
    try {
        if (!redisClient.isOpen) {
            return fallback;
        }
        return await operation();
    } catch (error) {
        console.warn('Redis operation failed, using fallback:', error.message);
        return fallback;
    }
};

// Function to add search query to user's recent searches
const addToRecentSearches = async (userId: string, query: string) => {
    const key = getUserRecentSearchesKey(userId);
    
    await safeRedisOperation(async () => {
        // Remove the query if it already exists (to move it to front)
        await redisClient.lRem(key, 0, query);
        
        // Add to the front of the list
        await redisClient.lPush(key, query);
        
        // Keep only the most recent 10 searches
        await redisClient.lTrim(key, 0, RECENT_SEARCHES_CONFIG.MAX_SEARCHES - 1);
        
        return null;
    }, null);
};

// Function to get user's recent searches
const getRecentSearches = async (userId: string): Promise<string[]> => {
    const key = getUserRecentSearchesKey(userId);
    
    return await safeRedisOperation(
        () => redisClient.lRange(key, 0, RECENT_SEARCHES_CONFIG.MAX_SEARCHES - 1),
        []
    );
};

// Function to clear user's recent searches
const clearRecentSearches = async (userId: string) => {
    const key = getUserRecentSearchesKey(userId);
    
    await safeRedisOperation(
        () => redisClient.del(key),
        null
    );
};

// WebFinger discovery function
const discoverActorViaWebFinger = async (handle: string) => {
    // Parse handle to extract domain if it's in @user@domain format
    let username: string;
    let domain: string;

    if (handle.startsWith('@')) {
        const parts = handle.slice(1).split('@');
        if (parts.length === 2) {
            username = parts[0];
            domain = parts[1];
        } else {
            throw new Error('Invalid handle format. Expected @username@domain');
        }
    } else if (handle.includes('@')) {
        const parts = handle.split('@');
        username = parts[0];
        domain = parts[1];
    } else {
        throw new Error('Handle must include domain (e.g., user@domain.com or @user@domain.com)');
    }

    const webfingerUrl = `https://${domain}/.well-known/webfinger?resource=acct:${username}@${domain}`;

    try {
        const response = await fetch(webfingerUrl, {
            headers: {
                'Accept': 'application/jrd+json',
                'User-Agent': 'YourApp/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`WebFinger lookup failed: ${response.status} ${response.statusText}`);
        }

        const webfingerData = await response.json();

        // Find the ActivityPub profile link
        const activityPubLink = webfingerData.links?.find(
            (link: any) => link.type === 'application/activity+json'
        );

        if (!activityPubLink?.href) {
            throw new Error('No ActivityPub profile found in WebFinger response');
        }

        // Fetch the ActivityPub profile
        const profileResponse = await fetch(activityPubLink.href, {
            headers: {
                'Accept': 'application/activity+json',
                'User-Agent': 'YourApp/1.0'
            }
        });

        if (!profileResponse.ok) {
            throw new Error(`Profile fetch failed: ${profileResponse.status} ${profileResponse.statusText}`);
        }

        return await profileResponse.json();
    } catch (error) {
        throw new Error(`WebFinger discovery failed: ${error.message}`);
    }
};

// Helper function to find user by handle (exact match)
export const findUserByHandle = async (handle: string): Promise<ActorDoc | null> => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yourdb');
        const actor = await Actor.findOne({ handle });
        return actor;
    } catch (error) {
        console.error('Error finding user by handle:', error);
        return null;
    }
};

// Get user's recent searches
router.get('/search/recent', async (req, res) => {
    try {
        const { handle } = req.query; // Assuming you have user authentication middleware

        const recentSearches = await getRecentSearches(handle as string);
        
        res.json({
            recent_searches: recentSearches,
            count: recentSearches.length
        });

    } catch (error) {
        console.error('Error getting recent searches:', error);
        res.status(500).json({ error: error.message });
    }
});

// Clear user's recent searches
router.delete('/search/recent', async (req, res) => {
    try {
        const {handle} = req.query; // Assuming you have user authentication middleware

        await clearRecentSearches(handle as string);
        
        res.json({ message: 'Recent searches cleared' });

    } catch (error) {
        console.error('Error clearing recent searches:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fuzzy search endpoint for local actors
router.get('/search/actors', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        const {handle} = req.query; // Assuming you have user authentication middleware

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        await mongoClient.connect();

        // Create text index on handle field if it doesn't exist
        try {
            await Actor.collection.createIndex({ handle: 'text' });
        } catch (indexError) {
            // Index might already exist, continue
        }

        // Perform fuzzy search using multiple strategies
        const searchResults = await Actor.aggregate([
            {
                $match: {
                    $or: [
                        // Text search
                        { $text: { $search: q } },
                        // Regex search for partial matches
                        { handle: { $regex: q, $options: 'i' } },
                        // Regex search for handles containing the query
                        { handle: { $regex: `.*${q}.*`, $options: 'i' } }
                    ]
                }
            },
            {
                $addFields: {
                    // Calculate relevance score
                    relevanceScore: {
                        $add: [
                            // Case-insensitive exact match
                            { $cond: [{ $eq: [{ $toLower: '$handle' }, { $toLower: q }] }, 100, 0] },
                            // Starts with query
                            { $cond: [{ $regexMatch: { input: '$handle', regex: `^${q}`, options: 'i' } }, 80, 0] },
                            // Contains query
                            { $cond: [{ $regexMatch: { input: '$handle', regex: q, options: 'i' } }, 50, 0] },
                            // Text search score
                            { $ifNull: [{ $meta: 'textScore' }, 0] }
                        ]
                    }
                }
            },
            { $sort: { relevanceScore: -1, handle: 1 } },
            { $limit: parseInt(limit as string) },
            {
                $project: {
                    userId: 1,
                    uri: 1,
                    handle: 1,
                    inboxUri: 1,
                    relevanceScore: 1
                }
            }
        ]);

        if (handle && q.trim().length > 0) {
            await addToRecentSearches(handle as string, JSON.stringify(searchResults));
        }

        res.json({
            query: q,
            results: searchResults,
            count: searchResults.length
        });

    } catch (error) {
        console.error('Error searching actors:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search endpoint that combines local search with WebFinger discovery
router.get('/search/users', async (req, res) => {
    try {
        const { q, includeRemote = 'true' } = req.query;
        const handle = "liam"; // Assuming you have user authentication middleware

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const results = {
            query: q,
            local: [],
            remote: null,
            total: 0
        };

        // First, search local actors
        await mongoClient.connect();

        try {
            await Actor.collection.createIndex({ handle: 'text' });
        } catch (indexError) {
            // Index might already exist
        }

        const localResults = await Actor.aggregate([
            {
                $match: {
                    $or: [
                        { $text: { $search: q } },
                        { handle: { $regex: q, $options: 'i' } },
                        { handle: { $regex: `.*${q}.*`, $options: 'i' } }
                    ]
                }
            },
            {
                $addFields: {
                    relevanceScore: {
                        $add: [
                            { $cond: [{ $eq: [{ $toLower: '$handle' }, { $toLower: q }] }, 100, 0] },
                            { $cond: [{ $regexMatch: { input: '$handle', regex: `^${q}`, options: 'i' } }, 80, 0] },
                            { $cond: [{ $regexMatch: { input: '$handle', regex: q, options: 'i' } }, 50, 0] },
                            { $ifNull: [{ $meta: 'textScore' }, 0] }
                        ]
                    }
                }
            },
            { $sort: { relevanceScore: -1, handle: 1 } },
            { $limit: 10 },
            {
                $project: {
                    userId: 1,
                    uri: 1,
                    handle: 1,
                    inboxUri: 1,
                    relevanceScore: 1,
                    source: { $literal: 'local' }
                }
            }
        ]);

        results.local = localResults;

        // If no exact local match and query looks like a handle, try WebFinger
        if (includeRemote === 'true' && (q.includes('@') || q.startsWith('@'))) {
            const exactLocalMatch = localResults.find(actor => 
                actor.handle.toLowerCase() === q.toLowerCase()
            );

            if (!exactLocalMatch) {
                try {
                    const remoteProfile = await discoverActorViaWebFinger(q);

                    // Extract relevant information from the ActivityPub profile
                    const remoteActor = {
                        userId: remoteProfile.id,
                        uri: remoteProfile.id,
                        handle: remoteProfile.preferredUsername ? 
                            `${remoteProfile.preferredUsername}@${new URL(remoteProfile.id).hostname}` : 
                            q,
                        inboxUri: remoteProfile.inbox,
                        displayName: remoteProfile.name,
                        summary: remoteProfile.summary,
                        icon: remoteProfile.icon?.url,
                        followersCount: remoteProfile.followers ? 
                            (typeof remoteProfile.followers === 'string' ? null : remoteProfile.followers.totalItems) : 
                            null,
                        followingCount: remoteProfile.following ? 
                            (typeof remoteProfile.following === 'string' ? null : remoteProfile.following.totalItems) : 
                            null,
                        source: 'remote'
                    };

                    results.remote = remoteActor;
                } catch (webfingerError) {
                    console.warn('WebFinger lookup failed:', webfingerError.message);
                    // Don't return error, just no remote results
                }
            }
        }

        results.total = results.local.length + (results.remote ? 1 : 0);
        console.log("ADDING")
        await addToRecentSearches(handle as string, JSON.stringify(results));
        

        res.json(results);

    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get actor profile (local first, then WebFinger if not found)
router.get('/actor/:handle', async (req, res) => {
    try {
        const { handle } = req.params;

        // First try to find locally with exact match
        const localActor = await findUserByHandle(handle);

        if (localActor) {
            res.json({
                ...localActor.toObject(),
                source: 'local'
            });
            return;
        }

        // If not found locally and handle looks like a remote handle, try WebFinger
        if (handle.includes('@') || handle.startsWith('@')) {
            try {
                const remoteProfile = await discoverActorViaWebFinger(handle);

                const remoteActor = {
                    userId: remoteProfile.id,
                    uri: remoteProfile.id,
                    handle: remoteProfile.preferredUsername ? 
                        `${remoteProfile.preferredUsername}@${new URL(remoteProfile.id).hostname}` : 
                        handle,
                    inboxUri: remoteProfile.inbox,
                    displayName: remoteProfile.name,
                    summary: remoteProfile.summary,
                    icon: remoteProfile.icon?.url,
                    publicKey: remoteProfile.publicKey,
                    source: 'remote'
                };

                res.json(remoteActor);

            } catch (webfingerError) {
                res.status(404).json({ 
                    error: 'Actor not found locally or via WebFinger',
                    details: webfingerError.message 
                });
            }
        } else {
            res.status(404).json({ error: 'Actor not found' });
        }

    } catch (error) {
        console.error('Error fetching actor:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;