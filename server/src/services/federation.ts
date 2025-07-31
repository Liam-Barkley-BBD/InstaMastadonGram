import { createFederation, importJwk, Person } from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import { MemoryKvStore, InProcessMessageQueue } from "@fedify/fedify";
import { findUserByHandle } from "./actor.service.ts";

const logger = getLogger("insta-mastadon-gram");

const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

federation.setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
  const actor = await findUserByHandle(identifier);
  
  if (!actor) return null;
  else console.log("Found user!")

  const keys = await ctx.getActorKeyPairs(identifier);
  return new Person({
    id: ctx.getActorUri(identifier),
    preferredUsername: identifier,
    name: identifier,
    // For the publicKey property, we only use first CryptographicKey:
    publicKey: keys[0].cryptographicKey,
    // For the assertionMethods property, we use all Multikey instances:
    assertionMethods: keys.map((key) => key.multikey),
  });
}).setKeyPairsDispatcher(async (ctx, identifier) => {
    const actor = await findUserByHandle(identifier);
    if (actor == null) return [];  // Return null if the key pair is not found.

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

export default federation;
