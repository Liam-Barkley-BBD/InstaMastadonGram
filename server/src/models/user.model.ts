import mongoose, { Document } from "mongoose";

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  name: String,
  email: String,
  handle: String,
});

export interface UserDoc extends Document {
  googleId: string;
  name: string;
  email: string;
  handle: string;
}
export default mongoose.model<UserDoc>("User", userSchema);;
