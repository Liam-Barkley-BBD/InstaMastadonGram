import {
  Accept,
  Create,
  createFederation,
  Endpoints,
  Follow,
  getActorHandle,
  importJwk,
  Person,
  Undo,
  type Recipient,
} from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import { MemoryKvStore, InProcessMessageQueue } from "@fedify/fedify";
import { findUserByHandle } from "./actor.service.ts";

import FollowModel from "../models/follow.model.ts";
import Actor from "../models/actor.model.ts";
import type { ActorDoc } from "../models/actor.model.ts";

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
    else console.log("Found user!");

    const keys = await ctx.getActorKeyPairs(identifier);
    return new Person({
      id: ctx.getActorUri(identifier),
      preferredUsername: identifier,
      name: identifier,
      // For the publicKey property, we only use first CryptographicKey:
      publicKey: keys[0].cryptographicKey,
      // For the assertionMethods property, we use all Multikey instances:
      assertionMethods: keys.map((key) => key.multikey),
      inbox: ctx.getInboxUri(identifier),
      endpoints: new Endpoints({
        sharedInbox: ctx.getInboxUri(),
      }),
      followers: ctx.getFollowersUri(identifier),
    });
  })

  .mapHandle((ctx, webFingerUsername) => {
    // internal actor identifier matches WebFinger username
    return webFingerUsername;
  })

  .setKeyPairsDispatcher(async (ctx, identifier) => {
    const actor = await findUserByHandle(identifier);
    if (actor == null) return []; // Return null if the key pair is not found.

    const keyPairs = [];

    if (actor.keys?.rsa) {
      keyPairs.push({
        publicKey: await importJwk(actor.keys.rsa.publicKey, "public"),
        privateKey: await importJwk(actor.keys.rsa.privateKey, "private"),
      });
    }

    if (actor.keys?.ed25519) {
      keyPairs.push({
        publicKey: await importJwk(actor.keys.ed25519.publicKey, "public"),
        privateKey: await importJwk(actor.keys.ed25519.privateKey, "private"),
      });
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
      { upsert: true, new: true, setDefaultsOnInsert: true },
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
    const accept = new Accept({
      actor: follow.objectId,
      object: follow,
      to: follow.actorId,
    });

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
      logger.info(
        `Removed follow from ${followerActor.handle} to ${followingActor.handle}`,
      );
    } else {
      logger.debug(
        `No follow found to remove from ${followerActor.handle} to ${followingActor.handle}`,
      );
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

  .onError(async (ctx, error) => {
    console.error(error);
  });

federation
  .setFollowersDispatcher(
    "/users/{identifier}/followers",
    async (ctx, identifier, cursor) => {
      const followingActor = await Actor.findOne({ handle: identifier });
      if (!followingActor) return { items: [] };

      const follows = await FollowModel.find({
        following: followingActor._id,
      }).populate<{
        follower: ActorDoc;
      }>("follower");

      const items: Recipient[] = follows.map((follow) => {
        const follower = follow.follower;
        return {
          id: follower?.uri ? new URL(follower.uri) : null,
          inboxId: follower?.inboxUri ? new URL(follower.inboxUri) : null,
          endpoints: follower?.sharedInboxUri
            ? { sharedInbox: new URL(follower.sharedInboxUri) }
            : null,
        };
      });

      return { items };
    },
  )

  .setCounter(async (ctx, identifier) => {
    const followingActor = await Actor.findOne({ handle: identifier });
    if (!followingActor) return 0;

    const count = await FollowModel.countDocuments({
      following: followingActor._id,
    });
    return count;
  });

export default federation;
