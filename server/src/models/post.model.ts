import { Schema, model, Types } from "mongoose";

const postSchema = new Schema({
  actor: { type: Types.ObjectId, ref: "Actor", required: true },
  content: { type: String, required: true },
  created: { type: Date, required: true },
  imageUrl: { type: String, required: false },
  videoUrl: { type: String, required: false },
});

const Post = model("Post", postSchema);
export default Post;
