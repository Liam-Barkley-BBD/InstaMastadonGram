import { client } from "../utils/mongo.ts";
import Actor from "../models/actor.model.ts";

export async function findUserByHandle(handle: string) {
  await client.connect();
  const actor = await Actor.findOne({ handle });
  return actor;
}
