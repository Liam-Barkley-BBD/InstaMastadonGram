import mongoose from "mongoose";

const actorSchema = new mongoose.Schema({
  uri: String,
  inboxUri: String,
  handle: String,
});

export default mongoose.model("Actor", actorSchema);
