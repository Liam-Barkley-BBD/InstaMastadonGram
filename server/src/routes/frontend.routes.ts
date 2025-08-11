import { Router } from "express";
import federation, { createContext } from "../federation/index.ts";
import {
  Collection,
  isActor,
  lookupObject,
  type Context,
} from "@fedify/fedify";

const router = Router();

const makeActivityPubRequest = async (url: any) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/activity+json",
      "Accept-encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "User-Agent": "YourApp/1.0",
    },
  });

  if (!response.ok) {
    console.error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};

// Get user profile
router.get("/profile", async (req, res) => {
  try {
    const { handle, uri } = req.query;
    const profileData = await makeActivityPubRequest(
      uri ?? `https://mastodon.social/users/${handle}`
    );
    res.json(profileData);
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: error.message });
  }
});

const getNextURL = async (
  ctx: Context<unknown>,
  handle: string,
  collectionType: "followers" | "following"
): Promise<any> => {
  const userObject = await ctx.lookupObject(handle);

  if (!userObject || !isActor(userObject)) {
    console.error("User not found.");
  }
  const collectionId =
    collectionType === "followers"
      ? userObject.followersId?.href
      : userObject.followingId?.href;

  if (!collectionId) {
    console.error(`${collectionType} collection not found.`);
  }

  const collection = await objectLookup(ctx, collectionId);

  if (!(collection instanceof Collection)) {
    console.error(`Valid ${collectionType} collection not found.`);
  }

  return collectionId;
};

async function objectLookup<T>(ctx: Context<T>, id: string) {
  try {
    const object = await ctx.lookupObject(id);
    return object;
  } catch (error) {
    return null;
  }
}

// Get user followers
router.get("/:collectionType/:handle", async (req, res) => {
  try {
    const { handle, collectionType } = req.params;
    const maxPages = parseInt(req.query.maxPages as string) || 5; // Allow limiting pages

    const userURI = await lookupObject(handle);

    if (userURI === null) {
      return res.json({ error: "User not found" });
    }

    const ctx = createContext(federation, req);
    const url = await getNextURL(
      ctx,
      handle,
      collectionType === "following" ? "following" : "followers"
    );

    if (!url) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!handle && !userURI) {
      return res
        .status(400)
        .json({ error: "Missing `handle` or `uri` parameter." });
    }

    const followingData = await getAllPaginatedItems(url, maxPages);

    res.json(followingData);
  } catch (error) {
    console.error("Error fetching following:", error);
    res.status(500).json({ error: "Failed to fetch following data." });
  }
});

// Get user posts
router.get("/posts", async (req, res) => {
  try {
    const { handle, uri } = req.query;
    const postsData = await makeActivityPubRequest(
      uri ?? `https://mastodon.social/users/${handle}/outbox?page=true`
    );
    res.json(postsData);
  } catch (error: any) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/profile/counts", async (req, res) => {
  try {
    const { handle, followerUrl, followingUrl, outboxUrl } = req.query;

    // Fetch all count endpoints in parallel
    const [followersResponse, followingResponse, postsResponse] =
      await Promise.allSettled([
        makeActivityPubRequest(
          followerUrl ?? `https://mastodon.social/users/${handle}/followers`
        ),
        makeActivityPubRequest(
          followingUrl ?? `https://mastodon.social/users/${handle}/following`
        ),
        makeActivityPubRequest(
          outboxUrl ?? `https://mastodon.social/users/${handle}/outbox`
        ),
      ]);

    const counts = {
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
    };

    // Extract follower count
    if (followersResponse.status === "fulfilled" && followersResponse.value) {
      counts.followersCount = followersResponse.value.totalItems || 0;
    }

    // Extract following count
    if (followingResponse.status === "fulfilled" && followingResponse.value) {
      counts.followingCount = followingResponse.value.totalItems || 0;
    }

    // Extract posts count
    if (postsResponse.status === "fulfilled" && postsResponse.value) {
      counts.postsCount = postsResponse.value.totalItems || 0;
    }

    res.json(counts);
  } catch (error: any) {
    console.error("Error fetching profile counts:", error);
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
      if (data.type === "OrderedCollection") {
        totalItems = data.totalItems || 0;
        // Get the first page URL
        currentUrl = data.first;
        continue;
      } else if (data.type === "OrderedCollectionPage") {
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
      console.error("Error fetching paginated data:", error);
      break;
    }
  }

  return {
    totalItems: totalItems || allItems.length,
    orderedItems: allItems,
    pagesLoaded: pageCount,
  };
};

export default router;
