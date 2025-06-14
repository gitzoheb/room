// store/useChatStore.js
import { create } from 'zustand';
import {
  sendMessage,
  getMessagesBetweenUsers,
  sendGroupMessage as sendGroupMessageAPI,
  getGroupMessages,
  deleteMessage,
  updateMessage,
  reactToMessage,
  deleteAllGroupMessages,
  deleteAllUserMessages,
  pinMessage,
  unpinMessage,
  // markMessagesAsSeen as markMessagesAsSeenAPI, // removed
} from '../services/axios';
import useUserStore from '../store/useUserStore.js';

// Utility: deduplicate messages by unique identifier
const dedupeById = (arr) => {
  const seen = new Set();
  return arr.filter((msg) => {
    const id = msg?._id || msg?.id;
    if (!id) return true; // keep if no id
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const generateLocalId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Utility helper to extract an id string from a plain id or populated object
const _getId = (val) => {
  if (val == null) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return val._id || val.id || null;
  return null;
};

const useChatStore = create((set, get) => ({
  messages: [],
  hasMoreMessages: true,
  messagesTotal: 0,
  loading: false,
  error: null,

  // Fetch direct chat messages between two users
  fetchDirectMessages: async (user1Id, user2Id, { limit = 20, before } = {}) => {
    set({ loading: true });
    try {
      const params = { limit };
      if (before) params.before = before;
      const res = await getMessagesBetweenUsers(user1Id, user2Id, params);
      // Ensure messages are in chronological (oldest -> newest) order
      const ordered = Array.isArray(res.data) ? [...res.data].reverse() : [];
      set((state) => ({
        messages: before ? dedupeById([...ordered, ...state.messages]) : dedupeById(ordered),
        hasMoreMessages: ordered.length === limit,
        loading: false,
      }));
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Fetch group chat messages
  fetchGroupMessages: async (groupId, { limit = 20, before } = {}) => {
    set({ loading: true });
    try {
      const params = { limit };
      if (before) params.before = before;
      const res = await getGroupMessages(groupId, params);
      // Ensure messages are in chronological order
      const ordered = Array.isArray(res.data) ? [...res.data].reverse() : [];
      set((state) => ({
        messages: before ? dedupeById([...ordered, ...state.messages]) : dedupeById(ordered),
        hasMoreMessages: ordered.length === limit,
        loading: false,
      }));
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Send direct message
  sendDirectMessage: async (data, isFormData = false) => {
    const { getSocket } = await import('../services/socket.js');
    const socketInstance = getSocket();

    // Use socket when text-only (no FormData) and socket connected
    if (!isFormData && socketInstance) {
      return new Promise((resolve, reject) => {
        socketInstance.emit('sendMessage', data, (resp) => {
          if (resp?.error) {
            set({ error: resp.error });
            reject(new Error(resp.error));
          } else {
            // Optimistically add the sent message to the store so it appears instantly
            set((state) => {
              const msg = resp?.data;
              if (!msg) return state;
              // If there's an existing pending version of this message, replace it instead of adding a new one
              const pendingIdx = state.messages.findIndex(
                (m) =>
                  m.pending === true &&
                  _getId(m.sender) === _getId(msg.sender) &&
                  (m.text || '') === (msg.text || '') &&
                  (_getId(m.group) === _getId(msg.group) || _getId(m.receiver) === _getId(msg.receiver))
              );
              if (pendingIdx !== -1) {
                const newMessages = [...state.messages];
                newMessages[pendingIdx] = { ...msg, pending: false, failed: false, deliveryStatus: resp?.delivered ? 'delivered' : 'sent' };
                return { messages: newMessages };
              }

              // Otherwise, append if it doesn't already exist
              const id = msg._id;
              const exists = state.messages.some((m) => (m._id || m.id) === id);
              return {
                messages: exists ? state.messages : [...state.messages, { ...msg, deliveryStatus: resp?.delivered ? 'delivered' : 'sent' }],
              };
            });
            resolve(resp);
          }
        });
      });
    }

    // Fallback to REST API (handles FormData/attachments)
    try {
      const response = await sendMessage(data, isFormData);
      // Server will broadcast the new message via socket, which will update the store.
      return response;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // Send group message
  sendGroupMessage: async (groupId, data, isFormData = false) => {
    const { getSocket } = await import('../services/socket.js');
    const socketInstance = getSocket();

    if (!isFormData && socketInstance) {
      return new Promise((resolve, reject) => {
        socketInstance.emit('sendMessage', { ...data, group: groupId }, (resp) => {
          if (resp?.error) {
            set({ error: resp.error });
            reject(new Error(resp.error));
          } else {
            // Optimistically add the sent message to the store so it appears instantly
            set((state) => {
              const msg = resp?.data;
              if (!msg) return state;
              // If there's an existing pending version of this message, replace it instead of adding a new one
              const pendingIdx = state.messages.findIndex(
                (m) =>
                  m.pending === true &&
                  _getId(m.sender) === _getId(msg.sender) &&
                  (m.text || '') === (msg.text || '') &&
                  (_getId(m.group) === _getId(msg.group) || _getId(m.receiver) === _getId(msg.receiver))
              );
              if (pendingIdx !== -1) {
                const newMessages = [...state.messages];
                newMessages[pendingIdx] = { ...msg, pending: false, failed: false, deliveryStatus: 'sent' };
                return { messages: newMessages };
              }

              // Otherwise, append if it doesn't already exist
              const id = msg._id;
              const exists = state.messages.some((m) => (m._id || m.id) === id);
              return {
                messages: exists ? state.messages : [...state.messages, { ...msg, deliveryStatus: 'sent' }],
              };
            });
            resolve(resp);
          }
          // Message will be added via socket broadcast.
        });
      });
    }

    try {
      const response = await sendGroupMessageAPI(groupId, data, isFormData);
      // Message will arrive via socket broadcast.
      return response;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // Delete message
  deleteChatMessage: async (messageId, data) => {
    try {
      await deleteMessage(messageId, data);
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId)
      }));
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // Update message
  updateChatMessage: async (messageId, data) => {
    try {
      const res = await updateMessage(messageId, data);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? res.data.data : msg
        ),
      }));
      return res.data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // React to a message
  reactToChatMessage: async (messageId, data) => {
    try {
      const res = await reactToMessage(messageId, data);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? res.data.data : msg
        ),
      }));
      return res.data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // Provide a method for incoming socket messages
  addIncomingMessage: async (msg) => {
    const { getSocket } = await import('../services/socket.js');
    const socketInstance = getSocket();

    set((state) => {
      // If message with same _id already exists, do nothing
      const exists = state.messages.some((m) => (m._id || m.id) === (msg._id || msg.id));
      if (exists) return state;

      // Try to find a matching optimistic (pending) message
      const pendingIdx = state.messages.findIndex(
        (m) =>
          m.pending === true &&
          _getId(m.sender) === _getId(msg.sender) &&
          (m.text || '') === (msg.text || '') &&
          (_getId(m.group) === _getId(msg.group) || _getId(m.receiver) === _getId(msg.receiver))
      );
      let newMessages;
      if (pendingIdx !== -1) {
        // Replace the pending message with the real one
        newMessages = [...state.messages];
        newMessages[pendingIdx] = { ...msg, pending: false, failed: false };
      } else {
        // Add as new
        newMessages = [...state.messages, msg];
      }

      // Prune any messages older than 45 days to respect retention policy
      const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000;
      newMessages = newMessages.filter((m) => new Date(m.createdAt || Date.now()).getTime() >= cutoff);

      // Notify server that message has been delivered
      if (socketInstance && msg._id) {
        socketInstance.emit('messageDelivered', msg._id);
      }

      return { messages: newMessages };
    });
  },

  clearMessages: () => set({ messages: [] }),

  // Delete all messages in a group
  deleteAllGroupMessages: async (groupId, data) => {
    try {
      await deleteAllGroupMessages(groupId, data);
      set({ messages: [] });
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // Delete all messages between two users
  deleteAllUserMessages: async (user1Id, user2Id, data) => {
    try {
      await deleteAllUserMessages(user1Id, user2Id, data);
      set({ messages: [] });
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // Pin a message
  pinChatMessage: async (messageId, data) => {
    try {
      const res = await pinMessage(messageId, data);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? res.data.data : msg
        ),
      }));
      return res.data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // Unpin a message
  unpinChatMessage: async (messageId, data) => {
    try {
      const res = await unpinMessage(messageId, data);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? res.data.data : msg
        ),
      }));
      return res.data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  resetMessages: () => set({ messages: [], hasMoreMessages: true, messagesTotal: 0 }),

  // Add a pending (optimistic) message
  addPendingMessage: (msg) => {
    set((state) => {
      // Prevent duplicate pending messages for the same text/sender/group/receiver
      const alreadyPending = state.messages.some(
        (m) =>
          m.pending === true &&
          _getId(m.sender) === _getId(msg.sender) &&
          (m.text || '') === (msg.text || '') &&
          (_getId(m.group) === _getId(msg.group) || _getId(m.receiver) === _getId(msg.receiver))
      );
      if (alreadyPending) return state;
      return {
        messages: [...state.messages, msg],
      };
    });
  },

  // Replace a message by localId with a new message (e.g., when server confirms)
  replaceMessageByLocalId: (localId, newMsg) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.localId === localId ? newMsg : msg
      ),
    }));
  },

  // Mark a pending message as failed
  markMessageFailed: (localId) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.localId === localId ? { ...msg, pending: false, failed: true } : msg
      ),
    }));
  },

  // Mark messages as seen
  // markMessagesAsSeen: async (messageIds) => {
  //   /* removed feature */
  // },

  // Handle incoming seen status updates
  // handleMessageSeen: (msg) => {
  //   /* removed feature */
  // },

  // Handle delivery/seen status updates via socket
  updateMessageStatus: (messageId, status) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        if ((m._id || m.id) !== messageId) return m;
        return { ...m, deliveryStatus: status };
      }),
    }));
  },
}));

export default useChatStore;
export { generateLocalId };
