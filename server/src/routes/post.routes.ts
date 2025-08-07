import express from "express";
import { Temporal } from "@js-temporal/polyfill";
import federation from "../services/federation.ts";
import Actor from "../models/actor.model.ts";
import Post from "../models/post.model.ts";
import { Create, Note, PUBLIC_COLLECTION, Image, Video, Link } from "@fedify/fedify";
import crypto from "crypto";
import { isAuthenticated } from "../middleware/authMiddleware.ts";
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


router.post("/:username", upload.single("media"), async (req, res) => {
    const { username } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Content is required and must be a string." });
    }

    const actor = await Actor.findOne({ handle: username });
    if (!actor) {
        return res.status(404).json({ error: "User not found." });
    }

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
    await ctx.sendActivity({ identifier: username }, "followers", activity);

    return res.status(201).json({
        id: postId,
        url: postUri?.href,
    });
});

export default router;
