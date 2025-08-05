import mongoose, { Document, Model, Schema } from "mongoose";

export interface ActorDoc extends Document {
  userId: string;
  uri: string;
  inboxUri: string;
  handle: string;
  sharedInboxUri?: string;
  keys?: {
    rsa?: {
      publicKey: Record<string, any>;
      privateKey: Record<string, any>;
    };
    ed25519?: {
      publicKey: Record<string, any>;
      privateKey: Record<string, any>;
    };
  };
}

const actorSchema = new Schema<ActorDoc>({
  userId: String,
  uri: { type: String, required: true },
  inboxUri: { type: String, required: true },
  handle: { type: String, required: true },
  sharedInboxUri: { type: String },
  keys: {
    rsa: {
      publicKey: { type: Schema.Types.Mixed },
      privateKey: { type: Schema.Types.Mixed },
    },
    ed25519: {
      publicKey: { type: Schema.Types.Mixed },
      privateKey: { type: Schema.Types.Mixed },
    },
  },
});

const Actor = mongoose.model<ActorDoc>("Actor", actorSchema);
export default Actor;