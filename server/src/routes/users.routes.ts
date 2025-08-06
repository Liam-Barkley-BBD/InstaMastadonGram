import { Router } from "express";
import federation from "../services/federation.ts";
import { Follow, isActor, Undo, type Recipient } from "@fedify/fedify";
import { findUserByHandle } from "../services/actor.service.ts";
import crypto from "crypto";
import { isAuthenticated } from "../middleware/authMiddleware.ts";
import ActivityModel from "../models/activity.model.ts";
import mongoose from "mongoose";

const router = Router();
router.use(isAuthenticated);

router.get('/me', async (req, res) => {
  try {
    const user = req.user;
    if(!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);

  } catch (error) {
    res.status(500).json({ error: `An error occured: ${error}`});
  }
})

router.post('/:username/follow', async (req, res) => {
  const username = req.params.username;
  const handle = req.body.actor;

  const domainUsername = extractUsernameAndDomain(handle);

  const externalActorResponse = await fetch(`https://${domainUsername?.domain}/users/${domainUsername?.username}`, {
    method: 'GET',
    headers: { 'Accept': 'application/activity+json' }
  });
  const externalActorInformation = await externalActorResponse.json();
  
  if (typeof handle !== 'string') {
    return res.status(400).send('Invalid actor handle or URL');
  }

  try {
    const externalContext = federation.createContext(new URL(externalActorInformation.url), undefined);
    const externalActor = await externalContext.lookupObject(handle.trim());
    const savedActor = await findUserByHandle(username);
    const internalContext = federation.createContext(new URL(savedActor?.uri!), undefined);

    if (!isActor(externalActor)) {
      return res.status(400).send('Invalid actor handle or URL');
    }

    const activityDetails: ActivityDetails = {
      actor: savedActor?.uri!,
      object: `${externalActor.id}`,
      domain: (new URL(savedActor?.uri!)).origin,
      username: username,
      type: 'follow'
    }
    await internalContext.sendActivity(
      { username: username },
      externalActor satisfies Recipient,
      new Follow({
        id: new URL(createActivityId(activityDetails)),
        actor: new URL(savedActor?.uri || ""),
        object: externalActor.id,
        to: externalActor.id,
      })
    );

    return res.status(200).send('Successfully sent a follow request');
    } catch (error) {
    console.error(error);
    return res.status(500).send('Internal server error');
   }
});

router.post('/:username/unfollow', async (req, res) => {
  const username = req.params.username;
  const handle = req.body.actor;

  const domainUsername = extractUsernameAndDomain(handle);

  const externalActorResponse = await fetch(`https://${domainUsername?.domain}/users/${domainUsername?.username}`, {
    method: 'GET',
    headers: { 'Accept': 'application/activity+json' }
  });
  const externalActorInformation = await externalActorResponse.json();
  
  if (typeof handle !== 'string') {
    return res.status(400).send('Invalid actor handle or URL');
  }

  try {
    const externalContext = federation.createContext(new URL(externalActorInformation.url), undefined);
    const externalActor = await externalContext.lookupObject(handle.trim());
    const savedActor = await findUserByHandle(username);
    const internalContext = federation.createContext(new URL(savedActor?.uri!), undefined);

    if (!isActor(externalActor)) {
      return res.status(400).send('Invalid actor handle or URL');
    }

    const followObject = await ActivityModel.findOne({ type: 'Follow', to: externalActor.id }).sort({ updatedAt: -1 });

    if(!followObject) return res.status(404).send(`Follow activity not found`);

    const activityDetails: ActivityDetails = {
      actor: savedActor?.uri!,
      object: `${externalActor.id}`,
      domain: (new URL(savedActor?.uri!)).origin,
      username: username,
      type: 'undo'
    }

    const unfollow = new Undo({
        id: new URL(createActivityId(activityDetails)),
        actor: new URL(savedActor?.uri || ""),
        object: new URL(followObject?.object.id),
        to: externalActor.id,
      })
    await internalContext.sendActivity(
      { username: username },
      externalActor satisfies Recipient,
      unfollow
    );

    const undoFollow = new ActivityModel({
      _id: new mongoose.Types.ObjectId(),
      type: "Undo",
      actor: new URL(savedActor?.uri || ""),
      object: JSON.parse(JSON.stringify(unfollow)),
      to: externalActor.id,
    })

    await ActivityModel.findByIdAndDelete(followObject);
    await undoFollow.save();

    return res.status(200).send(`Successfully unfollowed`);
    } catch (error) {
    console.error(error);
    return res.status(500).send('Internal server error');
   }
});


const extractUsernameAndDomain = (handle: string): {
  username: string,
  domain: string
} | null => {
  const match = handle.match(/^@?([^@]+)@([^@]+)$/);
  if (match) {
    return {
      username: match[1],
      domain: match[2]
    };
  }
  return null;
}

type ActivityDetails = {
  actor: string,
  object: string,
  domain: string,
  username: string,
  type: string
}

const createActivityId = (activityDetails: ActivityDetails): string => {
  const followActivity = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Follow',
    actor: activityDetails.actor,
    object: activityDetails.object
  };
  const hash = crypto.createHash('sha256').update(JSON.stringify(followActivity)).digest('hex');
  return `${activityDetails.domain}/${activityDetails.username}#${activityDetails.type}/${hash}`;
}

export default router;