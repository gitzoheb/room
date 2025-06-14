import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    avatar: { type: String },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  },
  {timestamps: true}
);

const Group = mongoose.model("Group", groupSchema);

export default Group;
