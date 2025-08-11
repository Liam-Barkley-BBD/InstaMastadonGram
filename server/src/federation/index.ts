import { createFederation, MemoryKvStore, type Federation } from "@fedify/fedify";
import type { Request } from "express";

const baseURL = "https://bbd-grad-program-2025.online";

export const federatedHostname = new URL(baseURL);

export function createContext(
  federation: Federation<unknown>,
  request?: Request
) {
  return federation.createContext(federatedHostname, undefined);
}

const federation = createFederation({
  kv: new MemoryKvStore(),
  origin: baseURL,
});

export default federation;

export const PAGINATION_LIMIT = 32;
