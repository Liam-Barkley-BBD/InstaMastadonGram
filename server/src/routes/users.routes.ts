import { Router, type Request, type Response } from "express";
import federation from "../services/federation.ts";
import { Follow, isActor, Undo, type Actor, type Context } from "@fedify/fedify";
import { isAuthenticated } from "../middleware/authMiddleware.ts";
import ActivityModel from "../models/activity.model.ts";
import mongoose from "mongoose";
import { createActivityId, extractUsernameAndDomain } from "../utils/helper.function.ts";
import { type UserDoc } from "../models/user.model.ts";

const router = Router();
router.use(isAuthenticated);

router.get('/me', async (req: Request, res: Response) => {
  try {
    const user = req.user as UserDoc;
    if(!user) {
      return res.status(404).json({ error: "Not found" });
    }
    res.status(200).json({ 
      googleId: user.googleId,
      name: user.name,
      email: user.email,
      handle: user.handle,
      url: user.url
    });

  } catch (error) {
    res.status(500).json({ error: `An error occured: ${error}`});
  }
})

router.post('/:username/activity', async (req: Request, res: Response) => {
  const username = req.params.username;
  const { handle, activity } = req.body;
  const domainUsername = extractUsernameAndDomain(handle);
  const isLocalDomain: boolean = new URL(process.env.DOMAIN!).hostname === domainUsername?.domain;
  const actorUrl: string = isLocalDomain ? `${process.env.DOMAIN!}/api/` : `https://${domainUsername?.domain}`;

  if (!handle || typeof handle !== 'string') {
    return res.status(400).send('Invalid actor handle or URL');
  }

  const contextData: ContextData = { session: req.sessionID, actor: username};

  try {
    const internalContext: Context<ContextData> = federation.createContext(new URL(`${process.env.DOMAIN}`), contextData) as Context<ContextData>;
    const externalContext: Context<ContextData> = federation.createContext(new URL(actorUrl), contextData) as Context<ContextData>;
    const externalActor = await externalContext.lookupObject(handle);

    let activityResponse;

    if (!isActor(externalActor)) {
      return res.status(400).send('Invalid actor handle or URL');
    }

    switch (activity.toLowerCase()) {
      case 'follow':
        activityResponse = await sendFollow(externalActor, internalContext, username);
        break;
      case 'unfollow':
        activityResponse = await sendUnfollow(externalActor, internalContext, username);
        break;
    }

    return res.status(200).json(activityResponse);
    } catch (error) {
    console.error(error);
    return res.status(500).json({error: 'Internal server error'});
   }
});

const sendUnfollow = async (externalActor: Actor, internalContext: Context<ContextData>, username: string) => {
  try {
    const activityDetails: ActivityDetails = {
      actor: `${internalContext.getActorUri(username)}`,
      object: `${externalActor.id}`,
      domain: internalContext.getActorUri(username).origin,
      username: username,
      type: 'undo'
    }

    const followObject  = await ActivityModel.findOne({ type: 'Follow', to: externalActor.id }).sort({ updatedAt: -1 });

    if(!followObject) return 'No activity for actor';

    const unfollow = new Undo({
      id: createActivityId(activityDetails),
      actor: internalContext.getActorUri(username),
      object: new URL(followObject?.object.id),
      to: externalActor.id,
    })
    await internalContext.sendActivity(
      { username: username },
      externalActor,
      unfollow
    );

    const undoFollow = new ActivityModel({
      _id: new mongoose.Types.ObjectId(),
      type: "Undo",
      actor: internalContext.getActorUri(username),
      object: JSON.parse(JSON.stringify(unfollow)),
      to: externalActor.id,
    })

    await ActivityModel.findByIdAndDelete(followObject);
    return await undoFollow.save();
  } catch (error) {
    return { error };
  }};

  const sendFollow = async (externalActor: Actor, internalContext: Context<unknown>, username: string): Promise<void> => {
    try {
      const activityDetails: ActivityDetails = {
      actor: `${internalContext.getActorUri(username)}`,
      object: `${externalActor.id}`,
      domain: internalContext.getActorUri(username).origin,
      username: username,
      type: 'follow'
    }
    const follow = await internalContext.sendActivity(
      { username: username },
      externalActor,
      new Follow({
        id: new URL(createActivityId(activityDetails)),
        actor: internalContext.getActorUri(username),
        object: externalActor.id,
    }));
    return follow;
  } catch (error) {
    console.error(error);
    return;
  }
 }

type ActivityDetails = {
  actor: string,
  object: string,
  domain: string,
  username: string,
  type: string
}

interface ContextData {
  session: string;
  actor: string;
}

export default router;