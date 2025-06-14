import { Server as SocketIOServer } from "socket.io";
import Message from "../models/message.model.js";

// In-memory map to track online users
const onlineUsers = new Map();
// Track socket instances by userId for reconnection handling
const userSockets = new Map();
// Track message delivery status
const messageDeliveryStatus = new Map();

// Keep a reference so other modules (e.g., REST controllers) can emit events
let ioReference = null;

export const getIo = () => ioReference;

export default function setupSocket(httpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
    pingTimeout: 60000, // Increase ping timeout to prevent premature disconnects
  });

  // Save reference
  ioReference = io;

  io.on("connection", (socket) => {
    const { userId } = socket.handshake.query;
    console.log(`User connected: ${userId}`);

    // Handle reconnection - clean up previous socket if exists
    if (userSockets.has(userId)) {
      const oldSocketId = userSockets.get(userId);
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      if (oldSocket && oldSocket.id !== socket.id) {
        console.log(`User ${userId} reconnected. Cleaning up old socket.`);
        // Just update our tracking maps without disconnecting the old socket
      }
    }

    // Mark user online and track their socket
    if (userId) {
      onlineUsers.set(userId, socket.id);
      userSockets.set(userId, socket.id);

      // Broadcast updated online users list
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));

      // Join user to their personal room for direct messages
      socket.join(userId);
      console.log(`User ${userId} joined their personal room`);

      // Send any pending messages that were sent while user was offline
      const pendingMessages = Array.from(messageDeliveryStatus.entries())
        .filter(([msgId, status]) => status.receiver === userId && !status.delivered)
        .map(([msgId]) => msgId);

      if (pendingMessages.length > 0) {
        console.log(`Sending ${pendingMessages.length} pending messages to user ${userId}`);
        // Fetch and send pending messages
        Message.find({ _id: { $in: pendingMessages } })
          .populate("sender", "name avatar")
          .populate("receiver", "name avatar")
          .populate("group", "name")
          .populate({
            path: "replyTo",
            select: "text sender _id",
            populate: { path: "sender", select: "name avatar" },
          })
          .then(messages => {
            messages.forEach(msg => {
              socket.emit("receiveMessage", msg);
              // Mark as delivered
              if (messageDeliveryStatus.has(msg._id.toString())) {
                const status = messageDeliveryStatus.get(msg._id.toString());
                status.delivered = true;

                // Notify the original sender that the message has been delivered
                const senderId = status.sender;
                if (senderId && onlineUsers.has(senderId)) {
                  io.to(senderId).emit("messageStatus", {
                    messageId: msg._id.toString(),
                    status: "delivered",
                  });
                }
              }
            });
          })
          .catch(err => console.error("Error fetching pending messages:", err));
      }
    }

    // Join any additional room (e.g. group chat)
    socket.on("joinRoom", (roomId) => {
      if (roomId) {
        socket.join(roomId);
        console.log(`User ${userId} joined room ${roomId}`);
      }
    });

    // Leave room
    socket.on("leaveRoom", (roomId) => {
      if (roomId) {
        socket.leave(roomId);
        console.log(`User ${userId} left room ${roomId}`);
      }
    });

    /*
      sendMessage payload expected:
      {
        sender: string (required),
        receiver?: string, // direct chat
        group?: string,    // group chat
        text: string,
        replyTo?: string
      }
    */
    socket.on("sendMessage", async (data, ack) => {
      try {
        const { sender, receiver, group, text, replyTo } = data || {};
        console.log("Received message:", data);

        if (!sender || (!receiver && !group)) {
          console.error("Invalid payload:", data);
          return ack?.({ error: "Invalid payload" });
        }

        const messageDoc = await Message.create({
          sender,
          receiver: receiver || null,
          group: group || null,
          text,
          media: [],
          replyTo: replyTo || null,
        });

        const populated = await Message.findById(messageDoc._id)
          .populate("sender", "name avatar")
          .populate("receiver", "name avatar")
          .populate("group", "name")
          .populate({
            path: "replyTo",
            select: "text sender _id",
            populate: { path: "sender", select: "name avatar" },
          });

        console.log("Broadcasting message:", populated);

        // Track message delivery status for direct messages
        if (receiver) {
          messageDeliveryStatus.set(populated._id.toString(), {
            sender,
            receiver,
            delivered: false,
            seen: false,
            timestamp: new Date(),
          });

          // For direct messages, emit to receiver
          console.log(`Emitting to receiver ${receiver}`);

          // Check if receiver is online
          const receiverSocketId = onlineUsers.get(receiver);
          const isReceiverOnline = !!receiverSocketId;

          // Emit to receiver if online
          if (isReceiverOnline) {
            io.to(receiver).emit("receiveMessage", populated);

            // Mark as delivered since receiver is online
            if (messageDeliveryStatus.has(populated._id.toString())) {
              messageDeliveryStatus.get(populated._id.toString()).delivered = true;
            }
          }

          // Send delivery status to sender
          ack?.({
            success: true,
            data: populated,
            delivered: isReceiverOnline,
          });
        } else if (group) {
          // For group messages, emit to the group room
          console.log(`Emitting to group ${group}`);
          io.to(group).emit("receiveMessage", populated);
          ack?.({ success: true, data: populated });
        }
      } catch (err) {
        console.error("Socket sendMessage error", err);
        ack?.({ error: "Server error" });
      }
    });

    // Handle message delivery confirmation
    socket.on("messageDelivered", (messageId) => {
      if (messageDeliveryStatus.has(messageId)) {
        messageDeliveryStatus.get(messageId).delivered = true;

        // Notify sender that message was delivered
        const senderId = messageDeliveryStatus.get(messageId).sender;
        if (senderId && onlineUsers.has(senderId)) {
          io.to(senderId).emit("messageStatus", {
            messageId,
            status: "delivered",
          });
        }
      }
    });

    // Handle message read confirmation
    socket.on("messageRead", (messageId) => {
      if (messageDeliveryStatus.has(messageId)) {
        const status = messageDeliveryStatus.get(messageId);
        status.delivered = true;
        status.seen = true;

        // Notify sender that message was read
        const senderId = status.sender;
        if (senderId && onlineUsers.has(senderId)) {
          io.to(senderId).emit("messageStatus", {
            messageId,
            status: "seen",
          });
        }
      }
    });

    // Handle typing indicator
    socket.on('typing', ({ toUserId, fromUserId, typing }) => {
      const recipientSocketId = onlineUsers.get(toUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('typing', { typing, fromUserId });
      }
    });

    socket.on("disconnect", () => {
      if (userId) {
        console.log(`User disconnected: ${userId}`);

        // Set a timeout before removing the user from online list
        // This helps handle brief disconnections (page refresh, etc.)
        setTimeout(() => {
          // Check if user has reconnected with a different socket
          const currentSocketId = userSockets.get(userId);
          if (currentSocketId === socket.id) {
            // User hasn't reconnected, remove from online users
            onlineUsers.delete(userId);
            userSockets.delete(userId);
            io.emit("onlineUsers", Array.from(onlineUsers.keys()));
          }
        }, 5000); // 5 second grace period for reconnection
      }
    });
  });

  return io;
} 