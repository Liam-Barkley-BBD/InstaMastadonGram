import { Router } from "express";
import federation from "../services/federation.ts";
import { Follow, isActor } from "@fedify/fedify";
import { findUserByHandle } from "../services/actor.service.ts";

const router = Router();
// router.use(isAuthenticated);

router.get('/', async (req, res) => {
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

router.post('/:username/following', async (req, res) => {
  const username = req.params.username;
  const handle = req.body.actor;

  const actor = await fetch(`https://mastodon.social/.well-known/webfinger?resource=acct:clivedev@mastodon.social`, {
    headers: { 'Accept': 'application/jrd+json, application/json' }
  }); //TODO: build up the url to fetch actor to send an activity to

  const actorInformation = await actor.json();
  const savedActor = await findUserByHandle(username);
  
  if (typeof handle !== 'string') {
    return res.status(400).send('Invalid actor handle or URL');
  }

  try {
    const externalContext = federation.createContext(new URL(actorInformation.links.find((info: any) => info.rel.toLowerCase() === 'self').href), undefined);
    const act = await externalContext.lookupObject(handle.trim());
    const internalContext = federation.createContext(new URL(savedActor?.uri!), undefined);

    const senderKeyPairs = await internalContext.getActorKeyPairs(username);

    if (!isActor(act)) {
      return res.status(400).send('Invalid actor handle or URL');
    }

    await externalContext.sendActivity(
      senderKeyPairs,
      act,
      new Follow({
        actor: internalContext.getActorUri(username),
        object: act.id,
        to: act.id,
      })
    );

    return res.status(200).send('Successfully sent a follow request');
    } catch (error) {
    console.error(error);
    return res.status(500).send('Internal server error');
   }
});

export default router;