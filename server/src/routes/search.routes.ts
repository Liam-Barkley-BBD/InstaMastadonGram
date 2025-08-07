import { Router } from "express";
import Actor from "../models/actor.model.ts";
import type { ActorDoc } from "../models/actor.model.ts";
import { client } from "../utils/mongo.ts";


const router = Router();

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

// Fuzzy search endpoint for local actors
router.get('/search/actors', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        await client.connect();

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

                results.remote = remoteActor;
            } catch (webfingerError) {
                console.warn('WebFinger lookup failed:', webfingerError.message);
                // Don't return error, just no remote results
            }
        }

        results.total = results.local.length + (results.remote ? 1 : 0);

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

// Save discovered remote actor to local database
router.post('/actor/save', async (req, res) => {
    try {
        const { handle } = req.body;

        if (!handle) {
            return res.status(400).json({ error: 'Handle is required' });
        }

        // Check if already exists with exact match
        const existingActor = await findUserByHandle(handle);
        if (existingActor) {
            return res.json({
                message: 'Actor already exists locally',
                actor: existingActor
            });
        }

        // Discover via WebFinger
        const remoteProfile = await discoverActorViaWebFinger(handle);

        // Create new actor record
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

    } catch (error) {
        console.error('Error saving actor:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;