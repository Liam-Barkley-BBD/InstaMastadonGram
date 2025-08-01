import { Schema, model, Types } from "mongoose";

const postSchema = new Schema({
  actor: { type: Types.ObjectId, ref: "Actor", required: true },
  content: { type: String, required: true },
  created: { type: Date, required: true},
});

const Post = model("Post", postSchema);
export default Post;
