import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI!;
export const client = new MongoClient(uri);
