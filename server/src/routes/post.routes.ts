import express from "express";
import { Temporal } from "@js-temporal/polyfill";
import federation from "../services/federation.ts";
import Actor from "../models/actor.model.ts";
import Post from "../models/post.model.ts";
import { Create, Note, PUBLIC_COLLECTION, Image, Video, Link } from "@fedify/fedify";
import crypto from "crypto";
import { isAuthenticated } from "../middleware/authMiddleware.ts";
import { extractMediaFromHtml, stripHtml } from "../utils/index.ts";

import { uploadBufferToS3 } from "../utils/s3.ts";
import fs from "fs/promises";

import multer from "multer";


const router = express.Router();
const upload = multer({
    storage: multer.diskStorage({
        destination: "uploads/",
        filename: (req, file, cb) => {
            cb(null, `${Date.now()}-${file.originalname}`);
        }
    }),
    limits: {
        fileSize: 100 * 1024 * 1024, //100mb
    }
});

// router.use(isAuthenticated);

router.post("/:username", (req, res, next) => {
    console.log("Incoming request before multer");
    next();
}, upload.single("media"), async (req, res) => {
    console.log("Inside route handler after multer");
    const { username } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Content is required and must be a string." });
    }

    const actor = await Actor.findOne({ handle: username });
    if (!actor) {
        return res.status(404).json({ error: "User not found." });
    }

    console.log("user found");

    let mediaUrl;

    // multer puts the file info on req.file
    if (req.file) {
        const filePath = req.file.path;
        try {
            const mimeType = req.file.mimetype;


            const allowedMimeTypes = ["image/png", "image/jpeg", "video/mp4"];
            if (!allowedMimeTypes.includes(mimeType)) {
                return res.status(400).json({ error: "Unsupported media type." });
            }

            const fileBuffer = await fs.readFile(filePath);

            mediaUrl = await uploadBufferToS3(fileBuffer, mimeType, "instamastadongram-media", `post-${username}`);


        } catch (err) {
            console.error("S3 upload failed:", err);
            return res.status(500).json({ error: "Failed to upload media." });
        } finally {
            try {
                await fs.unlink(filePath);
            } catch (unlinkErr) {
                console.warn(`Failed to delete temp file: ${filePath}`, unlinkErr);
            }
        }
    }

    const attachments: (Image | Video | Link)[] = [];
    const attachmentData = [];

    if (mediaUrl) {
        const mimeType = req.file?.mimetype;

        if (mimeType?.startsWith("image/")) {
            attachments.push(new Image({
                mediaType: mimeType,
                url: new URL(mediaUrl),
            }));

            attachmentData.push({
                type: "Image",
                mediaType: mimeType,
                url: mediaUrl,
            });
        } else if (mimeType?.startsWith("video/")) {
            attachments.push(new Video({
                mediaType: mimeType,
                url: new URL(mediaUrl),
            }));

            attachmentData.push({
                type: "Video",
                mediaType: mimeType,
                url: mediaUrl,
            });
        } else {
            attachments.push(new Link({
                mediaType: mimeType,
                href: new URL(mediaUrl),
            }));

            attachmentData.push({
                type: "Link",
                mediaType: mimeType,
                href: mediaUrl,
            });
        }
    }
    // create post document in mongo
    const postDoc = await Post.create({
        actor: actor._id,
        content,
        created: new Date(),
        attachments: attachmentData,
    });

    const postId = postDoc._id.toString();

    // create a federation context for this request
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const bodyString = JSON.stringify(req.body);
    const digest = `SHA-256=${crypto.createHash("sha256").update(bodyString).digest("base64")}`;

    const fetchRequest = new Request(fullUrl, {
        method: "POST",
        headers: {
            "host": req.get("host") ?? "",
            "date": new Date().toUTCString(),
            "content-type": "application/json",
            "digest": digest,
        },
        body: bodyString,
    });

    const ctx = federation.createContext(fetchRequest, undefined);
    if (!ctx) return res.status(500).json({ error: "Failed to create federation context" });

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
        attachments, // include optional attachments
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
    console.log("Sending activity to followers!")
    await ctx.sendActivity({ identifier: username }, "followers", activity);
    console.log("Activity sent!")

    return res.status(201).json({
        id: postId,
        url: postUri?.href,
    });
});

router.get("/explore", async (req, res) => {
  try {
    const { page = 1, limit = 20, instance } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;

    const fediverseInstances = [
      instance
    ];

    const fetchInstancePosts = async (instance: string) => {
      try {
        const response = await fetch(`https://${instance}/api/v1/timelines/public?limit=${limitNum * 3}`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'InstaMastadonGram/1.0'
          }
        });

        if (!response.ok) {
          console.warn(`Failed to fetch from ${instance}: ${response.status}`);
          return [];
        }

        const posts = await response.json();

        const filteredPosts = posts.filter((post: any) => {
          if (post.sensitive === true) {
            return false;
          }

          const plainText = stripHtml(post.content || '');
          const content = plainText.toLowerCase();
          const nsfwKeywords = [
            'nsfw', 'nsfl', 'sensitive', 'explicit', 'adult', 'mature',
            'porn', 'pornography', 'sex', 'sexual', 'nude', 'nudity',
            'violence', 'gore', 'blood', 'death', 'suicide', 'self-harm'
          ];

          const hasNsfwKeyword = nsfwKeywords.some(keyword =>
            content.includes(keyword) ||
            (post.tags && post.tags.some((tag: any) => tag.name.toLowerCase().includes(keyword)))
          );

          if (hasNsfwKeyword) {
            return false;
          }

          if (post.tags && post.tags.some((tag: any) => {
            const tagName = tag.name.toLowerCase();
            return nsfwKeywords.some(keyword => tagName.includes(keyword));
          })) {
            return false;
          }

          const asciiRatio = plainText.replace(/[^\x00-\x7F]/g, '').length / plainText.length;
          const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'];
          const lowerText = plainText.toLowerCase();
          const englishWordCount = englishWords.filter(word => lowerText.includes(word)).length;
          const isEnglish = asciiRatio >= 0.8 && (plainText.length < 10 || englishWordCount >= 2);

          if (!isEnglish) {
            return false;
          }

          return true;
        });

        return filteredPosts.map((post: any) => {
          const { images, videos } = extractMediaFromHtml(post.content || '');

          const mediaItems: Array<{ type: 'image' | 'video', url: string }> = [];

          images.forEach(url => {
            mediaItems.push({ type: 'image', url });
          });

          videos.forEach(url => {
            mediaItems.push({ type: 'video', url });
          });

          if (post.media_attachments && post.media_attachments.length > 0) {
            post.media_attachments.forEach((media: any) => {
              if (media.type === 'image') {
                mediaItems.push({
                  type: 'image',
                  url: media.url || media.preview_url
                });
              } else if (media.type === 'video') {
                mediaItems.push({
                  type: 'video',
                  url: media.url || media.preview_url
                });
              }
            });
          }

          return {
            id: post.id,
            content: stripHtml(post.content || ''),
            publishedDate: post.created_at,
            url: post.url,
            likes: post.favourites_count || 0,
            replies: post.replies_count || 0,
            shares: post.reblogs_count || 0,
            mediaItems: mediaItems,
            actor: {
              handle: post.account.username,
              name: post.account.display_name || post.account.username,
              id: post.account.id,
              domain: instance
            },
            instance: instance,
            sensitive: post.sensitive || false
          };
        });
      } catch (error) {
        console.warn(`Error fetching from ${instance}:`, error);
        return [];
      }
    };

    const instancePromises = fediverseInstances.map(fetchInstancePosts);
    const instanceResults = await Promise.allSettled(instancePromises);

    let allPosts: any[] = [];
    instanceResults.forEach((result, _) => {
      if (result.status === 'fulfilled') {
        allPosts.push(...result.value);
      }
    });

    const shuffleArray = (array: any[]) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const postsByAccount = new Map<string, any[]>();
    allPosts.forEach(post => {
      const accountKey = `${post.actor.handle}@${post.actor.domain}`;
      if (!postsByAccount.has(accountKey)) {
        postsByAccount.set(accountKey, []);
      }
      postsByAccount.get(accountKey)!.push(post);
    });

    const randomizedPosts: any[] = [];
    const accountKeys = Array.from(postsByAccount.keys());

    const shuffledAccounts = shuffleArray(accountKeys);

    let maxPostsPerAccount = Math.max(...Array.from(postsByAccount.values()).map(posts => posts.length));

    for (let i = 0; i < maxPostsPerAccount; i++) {
      for (const accountKey of shuffledAccounts) {
        const accountPosts = postsByAccount.get(accountKey)!;
        if (i < accountPosts.length) {
          randomizedPosts.push(accountPosts[i]);
        }
      }
    }

    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedPosts = randomizedPosts.slice(startIndex, endIndex);

    const localPosts = await Post.find({})
      .populate("actor", "handle name")
      .sort({ created: -1 })
      .limit(limitNum);

    const formattedLocalPosts = localPosts.map((post) => {
      const mediaItems: Array<{ type: 'image' | 'video', url: string }> = [];

      if (post.imageUrl) {
        mediaItems.push({ type: 'image', url: post.imageUrl });
      }
      if (post.videoUrl) {
        mediaItems.push({ type: 'video', url: post.videoUrl });
      }

      return {
        id: post._id.toString(),
        content: stripHtml(post.content || ''),
        publishedDate: post.created.toISOString(),
        mediaItems: mediaItems,
        imageUrl: post.imageUrl || null,
        videoUrl: post.videoUrl || null,
        actor: {
          handle: post.actor.handle,
          name: post.actor.handle,
          id: post.actor._id.toString(),
          domain: req.get("host") || "localhost"
        },
        url: `${req.protocol}://${req.get("host")}/users/${post.actor.handle}/posts/${post._id}`,
        likes: 0,
        replies: 0,
        shares: 0,
        instance: req.get("host") || "localhost"
      };
    });

    const combinedPosts = [...formattedLocalPosts, ...paginatedPosts];
    combinedPosts.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());

    const finalPosts = combinedPosts.slice(0, limitNum);

    res.status(200).json({
      items: finalPosts,
      totalItems: combinedPosts.length,
      hasNextPage: combinedPosts.length > limitNum,
      nextPage: combinedPosts.length > limitNum ? pageNum + 1 : undefined,
      pagesLoaded: pageNum,
      sources: {
        local: formattedLocalPosts.length,
        fediverse: paginatedPosts.length,
        instances: fediverseInstances
      }
    });
  } catch (error) {
    console.error("Error fetching fediverse posts:", error);
    res.status(500).json({ error: "Failed to fetch fediverse posts" });
  }
});

export default router;
