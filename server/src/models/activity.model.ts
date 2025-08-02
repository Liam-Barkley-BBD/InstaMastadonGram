import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  type: { type: String, required: true }, 
  actor: { type: String, required: true }, 
  object: { type: Object, required: true }, 
  to: { type: String, required: true},
}, {
  timestamps: true,
});

const ActivityModel = mongoose.model("Activity", ActivitySchema);
export default ActivityModel;
