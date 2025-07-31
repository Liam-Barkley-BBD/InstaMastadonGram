<<<<<<< HEAD
import mongoose, { Schema } from 'mongoose';

const ActorSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  uri: {
    type: String,
    required: true,
    unique: true
  },
  handle: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: false
  },
  inboxUrl: {
    type: String,
    required: true
  },
  sharedInboxUrl: {
    type: String,
    required: false
  },
  url: {
    type: String,
    required: false
  },
  created: {
    type: Date,
    default: Date.now
  },
  summary: {
    type: String,
    required: false
  },
  publicKey: {
    id: { type: String },
    owner: { type: String },
    publicKeyPem: { type: String }
  }
}, {
  timestamps: true
});

ActorSchema.methods.toActivityPubPerson = function() {
  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Person',
    id: this.uri,
    preferredUsername: this.handle,
    name: this.name,
    inbox: this.inboxUrl,
    endpoints: {
      sharedInbox: this.sharedInboxUrl
    },
    url: this.url,
    summary: this.summary,
    publicKey: this.publicKey ? {
      id: this.publicKey.id,
      owner: this.publicKey.owner,
      publicKeyPem: this.publicKey.publicKeyPem
    } : undefined
  };
};

const Actor = mongoose.model('Actor', ActorSchema);

export default Actor;
=======
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
>>>>>>> 61dff2e (added actor integration with db)
