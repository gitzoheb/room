import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // For individual chats, store receiver user ID
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return !this.group;
      },
    },
    // For group chats, store group ID
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: function () {
        return !this.receiver;
      },
    },
    // Allow text-only, media-only, or text+media messages. Require `text` only if
    // there are no media attachments to avoid validation errors when users send
    // an image without accompanying text.
    text: {
      type: String,
      default: "",
      required: function () {
        // `this` refers to the document being validated.
        return !this.media || this.media.length === 0;
      },
    },
    media: [
      {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ["image", "video", "file"],
          required: true,
        },
      },
    ],
    edited: {
      type: Boolean,
      default: false,
    },
    // Add other message types here (image, video, etc.) as needed
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        type: {
          type: String,
        },
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Add TTL index so that messages older than 45 days (3888000 seconds) are automatically
// removed by MongoDB. Note: ensure your MongoDB deployment has the TTL monitor enabled.
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 45 * 24 * 60 * 60 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
