import { Accept, Create, createFederation, Endpoints, Follow, getActorHandle, importJwk, PUBLIC_COLLECTION, Person, Undo, Note, type Recipient, isActor } from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import { MemoryKvStore, InProcessMessageQueue } from "@fedify/fedify";
import { findUserByHandle } from "./actor.service.ts";

import FollowModel from "../models/follow.model.ts";
import Actor from "../models/actor.model.ts";
import type { ActorDoc } from "../models/actor.model.ts";

import Post from "../models/post.model.ts";
import { Temporal } from "@js-temporal/polyfill";
import mongoose from "mongoose";
import ActivityModel from "../models/activity.model.ts";

const logger = getLogger("insta-mastadon-gram");

const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

// Actor dispatcher
federation
  .setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
    const actor = await findUserByHandle(identifier);

    if (!actor) return null;
    else console.log("Found user!")

    const keys = await ctx.getActorKeyPairs(identifier);

    return new Person({
      id: ctx.getActorUri(identifier),
      preferredUsername: identifier,
      name: identifier,
      publicKey: keys[0].cryptographicKey,
      assertionMethods: keys.map((key) => key.multikey),
      inbox: ctx.getInboxUri(identifier,),
      outbox: ctx.getOutboxUri(identifier),
      endpoints: new Endpoints({
        sharedInbox: ctx.getInboxUri(),
      }),
      followers: ctx.getFollowersUri(identifier),
      following: ctx.getFollowingUri(identifier),
    });
  })

  .mapHandle((ctx, webFingerUsername) => {
    // internal actor identifier matches WebFinger username
    return webFingerUsername;
  })

  .setKeyPairsDispatcher(async (ctx, identifier) => {
    const actor = await findUserByHandle(identifier);
    if (actor == null) return [];

    const keyPairs = [];

    if (actor.keys?.rsa) {
    try {
      const pub = await importJwk(actor.keys.rsa.publicKey, "public");
      const priv = await importJwk(actor.keys.rsa.privateKey, "private");
      keyPairs.push({ publicKey: pub, privateKey: priv });
    } catch (e) {
      console.error("RSA import failed:", e);
    }
  }
  
  if (actor.keys?.ed25519) {
    try {
      const pub = await importJwk(actor.keys.ed25519.publicKey, "public");
      const priv = await importJwk(actor.keys.ed25519.privateKey, "private");
      keyPairs.push({ publicKey: pub, privateKey: priv });
    } catch (e) {
      console.error("Ed25519 import failed:", e);
    }
  }

    return keyPairs;
  });

// Inbox dispatcher
federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")

  /* Follow activity */
  .on(Follow, async (ctx, follow) => {
    if (follow.objectId == null) {
      logger.debug("Missing follow.objectId");
      return;
    }

    const parsed = ctx.parseUri(follow.objectId);
    if (parsed?.type !== "actor") {
      logger.debug("Follow object is not an actor");
      return;
    }

    const recipientHandle = parsed.identifier;

    // get local actor being followed
    const followingActor = await Actor.findOne({ handle: recipientHandle });
    if (!followingActor) {
      logger.debug("Could not find local actor being followed");
      return;
    }

    const follower = await follow.getActor(ctx);
    if (!follower?.id || !follower.inboxId) {
      logger.debug("Could not resolve remote follower actor");
      return;
    }

    // upsert the remote follower actor
    const followerHandle = await getActorHandle(follower);
    const followerActor = await Actor.findOneAndUpdate(
      { uri: follower.id.href },
      {
        uri: follower.id.href,
        handle: followerHandle,
        name: follower.name?.toString() || followerHandle,
        inboxUri: follower.inboxId.href,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Save the follow relationship (if not already stored)
    const existingFollow = await FollowModel.findOne({
      follower: followerActor._id,
      following: followingActor._id,
    });

    if (!existingFollow) {
      await FollowModel.create({
        follower: followerActor._id,
        following: followingActor._id,
      });
    }

    logger.info(`Stored follow from ${followerHandle} to ${recipientHandle}`);

    // Send Accept response back to the follower
    const acceptId = new mongoose.Types.ObjectId();
    const acceptUri = ctx.getObjectUri(Accept, {
      identifier: recipientHandle,
      id: acceptId.toString(),
    });

    const accept = new Accept({
      id: acceptUri,
      actor: follow.objectId,
      object: follow,
      to: follow.actorId,
    });

    // store accept activity in db for mastadon
    const acceptActivity = new ActivityModel({
      _id: acceptId,
      type: "Accept",
      actor: follow.objectId.href,
      object: follow,
      to: follow.actorId?.href,
    });
    await acceptActivity.save();

    await ctx.sendActivity(parsed, follower, accept);
  })

  .on(Undo, async (ctx, undo) => {
    const object = await undo.getObject();

    if (!(object instanceof Follow)) return;

    if (undo.actorId == null || object.objectId == null) return;

    const parsed = ctx.parseUri(object.objectId);
    if (parsed == null || parsed.type !== "actor") return;

    const recipientHandle = parsed.identifier;

    const followingActor = await Actor.findOne({ handle: recipientHandle });
    if (!followingActor) return;

    const followerActor = await Actor.findOne({ uri: undo.actorId.href });
    if (!followerActor) return;

    // remove follow relationship from the DB
    const deleted = await FollowModel.findOneAndDelete({
      follower: followerActor._id,
      following: followingActor._id,
    });

    if (deleted) {
      logger.info(`Removed follow from ${followerActor.handle} to ${followingActor.handle}`);
    } else {
      logger.debug(`No follow found to remove from ${followerActor.handle} to ${followingActor.handle}`);
    }
  })

  .on(Create, async (ctx, create) => {
    if (create.toId == null) return;

    const to = ctx.parseUri(create.toId);
    if (to?.type !== "actor") return;

    const recipient = to.identifier;
    // Do something with the recipient
    console.log(`Received Create Activity from recipient: ${recipient}`);
  })

  .on(Accept, async (ctx, accept) => {
    const follow = await accept.getObject();
    if (!(follow instanceof Follow)) return;

    const following: Person = (await accept.getActor()) as Person;
    if (!isActor(following)) return;

    const follower = follow.actorId;
    if (follower == null) return;

    const parsed = ctx.parseUri(follower);
    if (parsed == null || parsed.type !== "actor") return;
    
    const followingHandle = await getActorHandle(following);
    const followingActor = await Actor.findOneAndUpdate(
      { uri: following.id },
      {
        uri: following.id,
        handle: followingHandle,
        name: following.name?.toString() || followingHandle,
        inboxUri: following.inboxId,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const followerActor = await Actor.findOne({ handle: parsed.identifier })
    const existingFollow = await FollowModel.findOne({
      follower: followerActor?._id,
      following: followingActor._id,
    });

    if (!existingFollow) {
      await FollowModel.create({
        follower: followerActor?._id,
        following: followingActor._id,
      });
    }

    logger.info(`Stored follow from ${parsed.identifier} to ${followingHandle}`);

    const followId = new mongoose.Types.ObjectId();
    const followActivity = new ActivityModel({
      _id: followId,
      type: "Follow",
      actor: follower,
      object: follow,
      to: following.id,
    });
    await followActivity.save();
  })

  .onError(async (ctx, error) => {
    console.error(error);
  });

federation
  .setFollowersDispatcher("/users/{identifier}/followers", async (ctx, identifier, cursor) => {
      const PAGE_SIZE = 10;

      if (cursor == null) return null;
      const page = parseInt(cursor, 10);
      if (isNaN(page) || page < 1) return null;

      const followingActor = await Actor.findOne({ handle: identifier });
      if (!followingActor) return null;

      const skip = (page - 1) * PAGE_SIZE;

      const follows = await FollowModel.find({ following: followingActor._id })
        .sort({ _id: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .populate<{ follower: ActorDoc }>("follower");

      const items = follows
        .filter(f => !!f.follower?.uri && !!f.follower?.inboxUri)
        .map(f => ({
          id: new URL(f.follower!.uri),
          inboxId: new URL(f.follower!.inboxUri),
          endpoints: {
            sharedInbox: f.follower!.inboxUri ? new URL(f.follower!.inboxUri) : null,
          },
        }));

      const totalItems = await FollowModel.countDocuments({ following: followingActor._id });
      const nextCursor = skip + PAGE_SIZE < totalItems ? String(page + 1) : null;

      return {
        items,
        nextCursor,
      };
    }
  )

  .setFirstCursor(async (ctx, identifier) => "1")

  .setCounter(async (ctx, identifier) => {
    const followingActor = await Actor.findOne({ handle: identifier });
    if (!followingActor) return 0;

    const count = await FollowModel.countDocuments({ following: followingActor._id });
    return count;
  });

federation
  .setObjectDispatcher(
    Note,
    "/users/{identifier}/posts/{id}",
    async (ctx, values) => {

      const post = await Post.findOne({ _id: values.id }).populate({
        path: 'actor',
        match: { handle: values.identifier }
      });

      if (!post || !post.actor) return null;

      return new Note({
        id: ctx.getObjectUri(Note, values),
        attribution: ctx.getActorUri(values.identifier),
        to: PUBLIC_COLLECTION,
        cc: ctx.getFollowersUri(values.identifier),
        content: post.content,
        mediaType: "text/html",
        published: Temporal.Instant.from(post.created.toISOString()),
        url: ctx.getObjectUri(Note, values),
      });
    }
  );

federation.
  setObjectDispatcher(
    Accept,
    "/users/{identifier}/accepts/{id}",
    async (ctx, { identifier, id }) => {
      const activity = await ActivityModel.findById(id);
      if (!activity || activity.type !== "Accept") return null;

      return new Accept({
        id: ctx.getObjectUri(Accept, { identifier, id }),
        actor: new URL(activity.actor),
        object: activity.object,
        to: new URL(activity.to),
      });
    }
  );

federation
  .setOutboxDispatcher(
    "/users/{identifier}/outbox",
    async (ctx, identifier, cursor) => {

      const actor = await Actor.findOne({ handle: identifier });
      if (!actor) {
        console.warn(`No actor found for identifier '${identifier}'`);
        return { items: [] };
      }

      const posts = await Post.find({ actor: actor._id })
        .sort({ created: -1 })
        .limit(20);

      const to = PUBLIC_COLLECTION;
      const cc = ctx.getFollowersUri(identifier);

      const activities = posts.map((post) => {
        const noteId = ctx.getObjectUri(Note, {
          identifier: identifier,
          id: post._id.toString(),
        });

        const note = new Note({
          id: noteId,
          attribution: ctx.getActorUri(identifier),
          to,
          cc,
          content: post.content,
          mediaType: "text/html",
          published: Temporal.Instant.from(post.created.toISOString()),
          url: noteId,
        });

        const createId = ctx.getObjectUri(Create, {
          identifier: identifier,
          id: post._id.toString(),
        });

        return new Create({
          id: createId,
          actor: ctx.getActorUri(identifier),
          object: note,
          published: note.published,
          to,
          cc,
        });
      });

      return {
        items: activities,
        cursor: null,
      };
    }
  );


federation
  .setObjectDispatcher(
    Create,
    "/users/{identifier}/creates/{id}",
    async (ctx, { identifier, id }) => {
      // implement logic to fetch and return the Create activity
      return null;
    }
  );

federation
  .setFollowingDispatcher("/users/{identifier}/following", async (ctx, identifier, cursor) => {
      const PAGE_SIZE = 10;
      if (cursor == null) return null;
      
      const page = parseInt(cursor, 10);
      if (isNaN(page) || page < 1) return null;

      const followingActor = await Actor.findOne({ handle: identifier });
      if (!followingActor) return null;

      const skip = (page - 1) * PAGE_SIZE;

      const follows = await FollowModel.find({ follower: followingActor._id })
        .sort({ _id: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .populate<{ following: ActorDoc }>("following");

      const items = follows
        .filter(f => !!f.following?.uri && !!f.following?.inboxUri)
        .map(f => new URL(f.following!.uri));

      const totalItems = await FollowModel.countDocuments({ following: followingActor._id });
      const nextCursor = skip + PAGE_SIZE < totalItems ? String(page + 1) : null;

      return {
        items,
        nextCursor,
      };
    }
  )

  .setFirstCursor(async (ctx, identifier) => "1")

  .setCounter(async (ctx, identifier) => {
    const followingActor = await Actor.findOne({ handle: identifier });
    if (!followingActor) return 0;

    const count = await FollowModel.countDocuments({ following: followingActor._id });
    return count;
  });

export default federation;
