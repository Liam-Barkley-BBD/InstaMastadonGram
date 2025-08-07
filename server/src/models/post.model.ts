import { Schema, model, Types } from "mongoose";

const postSchema = new Schema({
  actor: { type: Types.ObjectId, ref: "Actor", required: true },
  content: { type: String, required: true },
  created: { type: Date, required: true},
  attachments: [
    {
      type: { type: String, enum: ["Image", "Video", "Link"] },
      mediaType: { type: String, required: true },
      url: { type: String}, 
      href: { type: String}, 
    },
  ],
});

const Post = model("Post", postSchema);
export default Post;
