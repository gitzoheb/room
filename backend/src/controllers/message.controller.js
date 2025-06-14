import { getIo } from "../config/socket.js";
import User from "../models/user.model.js";
import Group from "../models/group.model.js";
import Message from "../models/message.model.js";

// Create a new message (direct or group)
export const createMessage = async (req, res) => {
  try {
    const { sender, receiver, group, text, replyTo } = req.body;

    if (!sender || (!receiver && !group)) {
      return res
        .status(400)
        .json({ message: "Sender and receiver or group are required." });
    }

    if (!text && (!req.files || req.files.length === 0)) {
      return res
        .status(400)
        .json({ message: "Text or media file is required." });
    }

    const senderExists = await User.findById(sender);
    if (!senderExists) {
      return res.status(404).json({ message: "Sender not found." });
    }

    if (receiver) {
      const receiverExists = await User.findById(receiver);
      if (!receiverExists) {
        return res.status(404).json({ message: "Receiver not found." });
      }
    }

    if (group) {
      const groupExists = await Group.findById(group);
      if (!groupExists) {
        return res.status(404).json({ message: "Group not found." });
      }
    }

    let media = [];
    if (req.files && req.files.length > 0) {
      media = req.files.map((file) => {
        let type = "file";
        if (file.mimetype.startsWith("image")) type = "image";
        else if (file.mimetype.startsWith("video")) type = "video";

        return {
          url: `/uploads/${file.filename}`,
          type,
        };
      });
    }

    const populatedMessage = await createNewMessage({
      sender,
      receiver: receiver || null,
      group: group || null,
      text: text || "",
      media,
      replyTo: replyTo || null,
    });

    // Emit through socket for real-time updates (handles messages containing media as well)
    const io = getIo();
    if (io) {
      if (receiver) {
        io.to(receiver).emit("receiveMessage", populatedMessage);
        io.to(sender).emit("receiveMessage", populatedMessage);
      } else if (group) {
        io.to(group).emit("receiveMessage", populatedMessage);
        io.to(sender).emit("receiveMessage", populatedMessage);
      }
    }

    res
      .status(201)
      .json({ message: "Message sent successfully.", data: populatedMessage });
  } catch (error) {
    console.error("Error in createMessage:", error);
    res
      .status(500)
      .json({ message: "Failed to send message.", error: error.message });
  }
};

// Get direct chat messages between two users
export const getMessagesBetweenUsers = async (req, res) => {
  try {
    const { user1Id, user2Id } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const before = req.query.before;
    const messages = await getDirectMessages(user1Id, user2Id, limit, before);
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error while fetching messages", error);
    res.status(500).json({ message: "Server error while fetching messages." });
  }
};

// Get group chat messages
export const getMessagesInGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const before = req.query.before;
    const messages = await getGroupMessages(groupId, limit, before);
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error while fetching messages", error);
    res.status(500).json({ message: "Server error while fetching messages." });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { sender } = req.body;

    if (!sender) {
      return res.status(400).json({ message: "Sender ID is required." });
    }

    const message = await findMessageById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    // Safely extract the sender's id regardless of whether the sender field is
    // populated (object) or still an ObjectId. When populated, `message.sender`
    // is an object containing an `_id` field. When not populated it is already
    // an ObjectId that can be converted to string directly.
    const messageSenderId =
      typeof message.sender === "object" && message.sender !== null
        ? message.sender._id?.toString()
        : message.sender?.toString();

    if (messageSenderId !== sender) {
      return res
        .status(403)
        .json({ message: "Only the sender can delete this message." });
    }

    await deleteMessageById(messageId);

    res.status(200).json({ message: "Message deleted successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete message.", error: error.message });
  }
};

// Update/edit a message
export const updateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newText, sender } = req.body;

    const message = await findMessageById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    // Safely extract the sender's id regardless of whether the sender field is
    // populated (object) or still an ObjectId. When populated, `message.sender`
    // is an object containing an `_id` field. When not populated it is already
    // an ObjectId that can be converted to string directly.
    const messageSenderId =
      typeof message.sender === "object" && message.sender !== null
        ? message.sender._id?.toString()
        : message.sender?.toString();

    if (messageSenderId !== sender) {
      return res
        .status(403)
        .json({ message: "Only the sender can edit the message." });
    }

    const populatedMessage = await updateMessageById(messageId, newText);

    res
      .status(200)
      .json({ message: "Message updated successfully.", data: populatedMessage });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating message.", error: error.message });
  }
};

// React to a message (like 👍, ❤️)
export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, type } = req.body;

    if (!userId || !type) {
      return res
        .status(400)
        .json({ message: "userId and reaction type are required." });
    }

    const message = await findMessageById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    const isAllowed =
      message.sender.toString() === userId ||
      (message.receiver && message.receiver.toString() === userId) ||
      message.group; // For group messages, allow any member to react

    if (!isAllowed) {
      return res
        .status(403)
        .json({ message: "Not authorized to react to this message." });
    }

    const populatedMessage = await reactToMessageById(messageId, userId, type);

    res
      .status(200)
      .json({ message: "Reaction updated successfully.", data: populatedMessage });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to react to message.", error: error.message });
  }
};

// Delete all messages in a group
export const deleteAllMessagesInGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { requesterId } = req.body;
    if (!groupId || !requesterId) {
      return res.status(400).json({ message: 'Group ID and requester ID are required.' });
    }
    // Only group admin can delete all messages
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found.' });
    if (group.admin.toString() !== requesterId) {
      return res.status(403).json({ message: 'Only the group admin can delete all messages.' });
    }
    await Message.deleteMany({ group: groupId });
    res.status(200).json({ message: 'All messages deleted for this group.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete all messages.', error: error.message });
  }
};

// Delete all messages between two users
export const deleteAllMessagesBetweenUsers = async (req, res) => {
  try {
    const { user1Id, user2Id } = req.params;
    const { requesterId } = req.body;
    if (!user1Id || !user2Id || !requesterId) {
      return res.status(400).json({ message: 'User IDs and requester ID are required.' });
    }
    // Only either user can delete all messages
    if (requesterId !== user1Id && requesterId !== user2Id) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    await Message.deleteMany({
      $or: [
        { sender: user1Id, receiver: user2Id },
        { sender: user2Id, receiver: user1Id },
      ],
    });
    res.status(200).json({ message: 'All messages deleted between users.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete all messages.', error: error.message });
  }
};

// Pin a message
export const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    if (message.group) {
      const group = await Group.findById(message.group);
      if (!group) return res.status(404).json({ message: 'Group not found.' });
      if (group.admin.toString() !== userId) {
        return res.status(403).json({ message: 'Only group admin can pin messages.' });
      }
      if (!group.pinnedMessages.includes(message._id)) {
        group.pinnedMessages.push(message._id);
        await group.save();
      }
    } else {
      // For direct messages, allow sender or receiver to pin
      if (message.sender.toString() !== userId && message.receiver.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to pin this message.' });
      }
    }
    message.isPinned = true;
    await message.save();
    res.status(200).json({ message: 'Message pinned successfully.', data: message });
  } catch (error) {
    res.status(500).json({ message: 'Failed to pin message.', error: error.message });
  }
};

// Unpin a message
export const unpinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    if (message.group) {
      const group = await Group.findById(message.group);
      if (!group) return res.status(404).json({ message: 'Group not found.' });
      if (group.admin.toString() !== userId) {
        return res.status(403).json({ message: 'Only group admin can unpin messages.' });
      }
      group.pinnedMessages = group.pinnedMessages.filter(
        (msgId) => msgId.toString() !== message._id.toString()
      );
      await group.save();
    } else {
      // For direct messages, allow sender or receiver to unpin
      if (message.sender.toString() !== userId && message.receiver.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to unpin this message.' });
      }
    }
    message.isPinned = false;
    await message.save();
    res.status(200).json({ message: 'Message unpinned successfully.', data: message });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unpin message.', error: error.message });
  }
};

// Mark messages as seen
export const markMessagesAsSeen = async (req, res) => {
  try {
    const { messageIds, userId } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || !userId) {
      return res.status(400).json({ message: "Message IDs array and user ID are required." });
    }

    const io = getIo();
    const updatedMessages = [];

    for (const messageId of messageIds) {
      const message = await Message.findById(messageId);
      if (!message) continue;

      // Check if user has already seen this message
      const alreadySeen = message.seenBy.some(seen => seen.user.toString() === userId);
      if (alreadySeen) continue;

      // Add user to seenBy array
      message.seenBy.push({ user: userId, seenAt: new Date() });
      await message.save();

      // Populate the message for socket emission
      const populatedMessage = await Message.findById(messageId)
        .populate("sender", "name username avatar")
        .populate("receiver", "name username avatar")
        .populate("group", "name avatar")
        .populate("replyTo")
        .populate("seenBy.user", "name username avatar");

      updatedMessages.push(populatedMessage);

      // Emit through socket for real-time updates
      if (io) {
        if (message.receiver) {
          // Direct message
          io.to(message.receiver.toString()).emit("messageSeen", populatedMessage);
          io.to(message.sender.toString()).emit("messageSeen", populatedMessage);
        } else if (message.group) {
          // Group message
          io.to(message.group.toString()).emit("messageSeen", populatedMessage);
        }
      }
    }

    res.status(200).json({ 
      message: "Messages marked as seen successfully.", 
      data: updatedMessages 
    });
  } catch (error) {
    console.error("Error in markMessagesAsSeen:", error);
    res.status(500).json({ 
      message: "Failed to mark messages as seen.", 
      error: error.message 
    });
  }
};

// Get all pinned messages for the authenticated user
export const getPinnedMessages = async (req, res) => {
  try {
    // The user is injected by `requireUser` middleware
    const userId = req.user?._id?.toString();
    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // 1. Find groups where the user is a member so we can include pinned group messages
    const userGroups = await Group.find({ members: userId }).select("_id");
    const groupIds = userGroups.map((g) => g._id);

    // 2. Query for all messages that are pinned and either:
    //    - Sent or received by the user (direct messages)
    //    - Belong to a group the user is part of (group messages)
    const pinned = await Message.find({
      isPinned: true,
      $or: [
        { sender: userId },
        { receiver: userId },
        { group: { $in: groupIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name username avatar")
      .populate("receiver", "name username avatar")
      .populate("group", "name avatar");

    res.status(200).json(pinned);
  } catch (error) {
    console.error("Error in getPinnedMessages:", error);
    res.status(500).json({ message: "Failed to fetch pinned messages.", error: error.message });
  }
};

// Helper/service functions for message operations
export async function createNewMessage({ sender, receiver = null, group = null, text = "", media = [], replyTo = null }) {
  const newMsg = await Message.create({ sender, receiver, group, text, media, replyTo });
  return Message.findById(newMsg._id)
    .populate("sender", "username email avatar")
    .populate("receiver", "username email avatar")
    .populate("group", "name avatar")
    .populate({ path: "replyTo", populate: { path: "sender", select: "username avatar email" } });
}

export async function getDirectMessages(user1Id, user2Id, limit = 20, before = null) {
  const query = {
    $or: [
      { sender: user1Id, receiver: user2Id },
      { sender: user2Id, receiver: user1Id },
    ],
  };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }
  return Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("sender", "username email avatar")
    .populate("receiver", "username email avatar");
}

export async function getGroupMessages(groupId, limit = 20, before = null) {
  const query = { group: groupId };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }
  return Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("sender", "username email avatar");
}

export async function findMessageById(messageId) {
  return Message.findById(messageId)
    .populate("sender", "username email avatar")
    .populate("receiver", "username email avatar")
    .populate("group", "name avatar");
}

export async function deleteMessageById(messageId) {
  await Message.findByIdAndDelete(messageId);
}

export async function updateMessageById(messageId, newText) {
  await Message.findByIdAndUpdate(messageId, { text: newText, edited: true });
  return findMessageById(messageId);
}

export async function reactToMessageById(messageId, userId, type) {
  const msg = await Message.findById(messageId);
  if (!msg) return null;
  const existingReactionIndex = msg.reactions.findIndex((r) => r.user.toString() === userId);
  if (existingReactionIndex !== -1) {
    msg.reactions[existingReactionIndex].type = type; // update existing reaction
  } else {
    msg.reactions.push({ user: userId, type });
  }
  await msg.save();
  return findMessageById(messageId);
}
