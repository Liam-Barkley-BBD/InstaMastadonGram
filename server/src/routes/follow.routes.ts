import { Router } from "express";
import { isAuthenticated } from "../middleware/authMiddleware.ts";
import { Follow, isActor } from "@fedify/fedify";
import federation from "../services/federation.ts";

const router: Router = Router();
router.use(isAuthenticated);

/*
  - Following an external user:
    
*/
router.post("/follow", async (req, res) => {
  const username = req.body.username;
  const handle = "@clivedev@mastodon.social";
  if (typeof handle !== "string") {
    return res.status(400).json("Invalid actor handle or URL");
  }
  const ctx = federation.createContext(req.body, undefined);
  const actor = await ctx.lookupObject(handle.trim());
  if (!isActor(actor)) {
    return res.status(400).json("Invalid actor handle or URL");
  }
  await ctx.sendActivity(
    { identifier: username },
    actor,
    new Follow({
      actor: ctx.getActorUri(username),
      object: actor.id,
      to: actor.id,
    }),
  );
  return res.status(200).json("Successfully sent a follow request");

})

export default router;