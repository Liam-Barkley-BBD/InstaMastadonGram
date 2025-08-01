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

export interface UserActor {
  userId: string,
  uri: string,
  handle: string,
  name: string,
  inboxUrl: string,
  sharedInboxUrl:string,
  url: string,
  created: Date,
  summary: string,
  publicKey: string
}

export default mongoose.model('Actor', ActorSchema);
