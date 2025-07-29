import { serve } from "@hono/node-server";
import { behindProxy } from "x-forwarded-fetch";
import { configure, getConsoleSink } from "@logtape/logtape";

import {
  createFederation,
  Follow,  
  Person,
  MemoryKvStore,
} from "@fedify/fedify";

await configure({
  sinks: { console: getConsoleSink() },
  filters: {},
  loggers: [
    { category: "fedify",  sinks: ["console"], lowestLevel: "info" },
  ],
});

const federation = createFederation<void>({
  kv: new MemoryKvStore(),
});

federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")
  .on(Follow, async (ctx, follow) => {
    if (follow.id == null || follow.actorId == null || follow.objectId == null) {
      return;
    }
    const parsed = ctx.parseUri(follow.objectId);
    if (parsed?.type !== "actor" || parsed.identifier !== "me") return;
    const follower = await follow.getActor(ctx);
    console.debug(follower);
  });

federation.setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
  if (identifier !== "liam") return null;
  return new Person({
    id: ctx.getActorUri(identifier),
    name: "Liam Barkley",
    summary: "This is me!", 
    preferredUsername: identifier,
    url: new URL("/", ctx.url),
    inbox: ctx.getInboxUri(identifier),
  });
});

serve({
  port: 8000,
  fetch: behindProxy((request) => federation.fetch(request, { contextData: undefined }))
});
