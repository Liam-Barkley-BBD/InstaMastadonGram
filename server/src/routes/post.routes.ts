import express from "express";
import { Temporal } from "@js-temporal/polyfill";
import federation from "../services/federation.ts";
import Actor from "../models/actor.model.ts";
import Post from "../models/post.model.ts";
import { Create, Note, PUBLIC_COLLECTION } from "@fedify/fedify";
import crypto from "crypto";
import { isAuthenticated } from "../middleware/authMiddleware.ts";

const router = express.Router();

// Apply authentication to all routes except /all
router.use((req, res, next) => {
  if (req.path === "/all") {
    return next();
  }
  return isAuthenticated(req, res, next);
});

router.post("/:username", async (req, res) => {
  const { username } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== "string") {
    return res
      .status(400)
      .json({ error: "Content is required and must be a string." });
  }

  const actor = await Actor.findOne({ handle: username });
  if (!actor) {
    return res.status(404).json({ error: "User not found." });
  }

  // create post document in mongo
  const postDoc = await Post.create({
    actor: actor._id,
    content,
    created: new Date(),
  });

  const postId = postDoc._id.toString();

  // create a federation context for this request
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const bodyString = JSON.stringify(req.body);
  const digest = `SHA-256=${crypto
    .createHash("sha256")
    .update(bodyString)
    .digest("base64")}`;

  const fetchRequest = new Request(fullUrl, {
    method: "POST",
    headers: {
      host: req.get("host") ?? "",
      date: new Date().toUTCString(),
      "content-type": "application/json",
      digest: digest,
    },
    body: bodyString,
  });

  const ctx = federation.createContext(fetchRequest, undefined);
  if (!ctx)
    return res
      .status(500)
      .json({ error: "Failed to create federation context" });

  // construct Note URI
  const postUri = ctx.getObjectUri(Note, { identifier: username, id: postId });

  // create Note object
  const note = new Note({
    id: postUri,
    attribution: ctx?.getActorUri(username),
    to: PUBLIC_COLLECTION,
    cc: ctx.getFollowersUri(username),
    content,
    mediaType: "text/html",
    published: Temporal.Instant.from(postDoc.created.toISOString()),
    url: postUri,
  });

  // create activity wrapping the Note
  const activity = new Create({
    id: new URL("#activity", note.id ?? "https://example.com/"),
    actor: ctx.getActorUri(username),
    object: note,
    to: PUBLIC_COLLECTION,
    cc: ctx.getFollowersUri(username),
  });

  // send the Create activity to all followers
  console.log("Sending activity to followers!");
  await ctx.sendActivity({ identifier: username }, "followers", activity);
  console.log("Activity sent!");

  return res.status(201).json({
    id: postId,
    url: postUri?.href,
  });
});

router.get("/all", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;

    // Get all posts from the database with pagination
    const posts = await Post.find({})
      .populate("actor", "handle name")
      .sort({ created: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const totalPosts = await Post.countDocuments({});

    const formattedPosts = posts.map((post) => ({
      id: post._id.toString(),
      content: post.content,
      publishedDate: post.created.toISOString(),
      imageUrl: post.imageUrl || null,
      videoUrl: post.videoUrl || null,
      actor: {
        handle: post.actor.handle,
        name: post.actor.handle, // Use handle as name since Actor model doesn't have name field
        id: post.actor._id.toString(),
      },
      url: `${req.protocol}://${req.get("host")}/users/${
        post.actor.handle
      }/posts/${post._id}`,
      likes: 0, // Default value, can be enhanced later
      replies: 0, // Default value, can be enhanced later
      shares: 0, // Default value, can be enhanced later
    }));

    res.status(200).json({
      items: formattedPosts,
      totalItems: totalPosts,
      hasNextPage: pageNum * limitNum < totalPosts,
      nextPage: pageNum * limitNum < totalPosts ? pageNum + 1 : undefined,
      pagesLoaded: pageNum,
    });
  } catch (error) {
    console.error("Error fetching all posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

export default router;
