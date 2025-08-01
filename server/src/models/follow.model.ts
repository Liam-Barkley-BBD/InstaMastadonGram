import mongoose from "mongoose";

const followSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: "Actor" },
  following: { type: mongoose.Schema.Types.ObjectId, ref: "Actor" },
});

export default mongoose.model("Follow", followSchema);
