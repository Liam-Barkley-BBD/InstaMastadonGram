import { Router } from "express";
import Actor from "../models/actor.model.ts";
import type { ActorDoc } from "../models/actor.model.ts";
import { client as mongoClient } from "../utils/mongo.ts";
import { redisClient } from "../utils/redis.ts";
import mongoose from "mongoose";

const router = Router();


const RECENT_SEARCHES_CONFIG = {
    MAX_SEARCHES: 10,
    KEY_PREFIX: 'recent_searches:'
};

const getUserRecentSearchesKey = (userId: string) => {
    return `${RECENT_SEARCHES_CONFIG.KEY_PREFIX}${userId}`;
};

const safeRedisOperation = async <T>(
    operation: () => Promise<T>,
    fallback: T
): Promise<T> => {
    try {
        if (!redisClient.isOpen) {
            return fallback;
        }
        return await operation();
    } catch (error:any) {
        console.warn('Redis operation failed, using fallback:', error.message);
        return fallback;
    }
};

const addToRecentSearches = async (userId: string, query: string) => {
    const key = getUserRecentSearchesKey(userId);

    await safeRedisOperation(async () => {
        await redisClient.lRem(key, 0, query);

        await redisClient.lPush(key, query);

        await redisClient.lTrim(key, 0, RECENT_SEARCHES_CONFIG.MAX_SEARCHES - 1);

        return null;
    }, null);
};

const getRecentSearches = async (userId: string): Promise<string[]> => {
    const key = getUserRecentSearchesKey(userId);

    return await safeRedisOperation(
        () => redisClient.lRange(key, 0, RECENT_SEARCHES_CONFIG.MAX_SEARCHES - 1),
        []
    );
};

const clearRecentSearches = async (userId: string) => {
    const key = getUserRecentSearchesKey(userId);

    await safeRedisOperation(
        () => redisClient.del(key),
        null
    );
};

const discoverActorViaWebFinger = async (handle: string) => {
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
    } catch (error:any) {
        throw new Error(`WebFinger discovery failed: ${error.message}`);
    }
};

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

router.get('/recent', async (req, res) => {
    try {
        const { handle } = req.query; // Assuming you have user authentication middleware

        const recentSearches = await getRecentSearches(handle as string);

        res.json({
            recent_searches: recentSearches,
            count: recentSearches.length
        });

    } catch (error:any) {
        console.error('Error getting recent searches:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/recent', async (req, res) => {
    try {
        const { handle, profile } = req.body;

        if (!handle || !profile) {
            return res.status(400).json({ error: 'Missing handle or searchTerm' });
        }

        await addToRecentSearches(handle, JSON.stringify(profile));

        res.status(201).json({ message: 'Search term added to recent searches' });

    } catch (error:any) {
        console.error('Error adding to recent searches:', error);
        res.status(500).json({ error: error.message });
    }
});


// Clear user's recent searches
router.delete('/recent', async (req, res) => {
    try {
        const {handle} = req.query;

        await clearRecentSearches(handle as string);

        res.json({ message: 'Recent searches cleared' });

    } catch (error:any) {
        console.error('Error clearing recent searches:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/actors', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        await mongoClient.connect();

        try {
            await Actor.collection.createIndex({ handle: 'text' });
        } catch (indexError) {
        }

        // Perform fuzzy search using multiple strategies
        const searchResults = await Actor.aggregate([
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
                    // Calculate relevance score
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

        res.json({
            query: q,
            results: searchResults,
            count: searchResults.length
        });

    } catch (error:any) {
        console.error('Error searching actors:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        const { q, includeRemote = 'true' } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const results = {
            query: q,
            local: [],
            remote: null,
            total: 0
        };


        // If no exact local match and query looks like a handle, try WebFinger
        if (includeRemote === 'true' && (q.includes('@') || q.startsWith('@'))) {

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

                results.remote = remoteActor as any;
            } catch (webfingerError:any) {
                console.warn('WebFinger lookup failed:', webfingerError.message);
            }
        }

        results.total = results.local.length + (results.remote ? 1 : 0);

        res.json(results);

    } catch (error:any) {
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

            } catch (webfingerError:any) {
                res.status(404).json({
                    error: 'Actor not found locally or via WebFinger',
                    details: webfingerError.message
                });
            }
        } else {
            res.status(404).json({ error: 'Actor not found' });
        }

    } catch (error:any) {
        console.error('Error fetching actor:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/actor/save', async (req, res) => {
    try {
        const { handle } = req.body;

        if (!handle) {
            return res.status(400).json({ error: 'Handle is required' });
        }

        const existingActor = await findUserByHandle(handle);
        if (existingActor) {
            return res.json({
                message: 'Actor already exists locally',
                actor: existingActor
            });
        }

        const remoteProfile = await discoverActorViaWebFinger(handle);

        const newActor = new Actor({
            userId: remoteProfile.id,
            uri: remoteProfile.id,
            handle: remoteProfile.preferredUsername ?
                `${remoteProfile.preferredUsername}@${new URL(remoteProfile.id).hostname}` :
                handle,
            inboxUri: remoteProfile.inbox,
            sharedInboxUri: remoteProfile.sharedInbox,
            keys: {
                rsa: {
                    publicKey: remoteProfile.publicKey
                }
            }
        });

        const savedActor = await newActor.save();

        res.json({
            message: 'Actor saved successfully',
            actor: savedActor
        });

    } catch (error:any) {
        console.error('Error saving actor:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;