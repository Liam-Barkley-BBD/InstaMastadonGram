import mongoose, { Schema } from "mongoose";

const sessionSchema: Schema = new mongoose.Schema({
  expires: Date,
  lastModified: Date,
  session: String
});

export default mongoose.model("Session", sessionSchema);