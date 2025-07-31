import mongoose from "mongoose";

const actorSchema = new mongoose.Schema({
  uri: String,
  inboxUri: String,
  handle: String,
  keys: {
    rsa: {
      publicKey: Object,
      privateKey: Object,
    },
    ed25519: {
      publicKey: Object,
      privateKey: Object,
    },
  },
});

export default mongoose.model("Actor", actorSchema);
