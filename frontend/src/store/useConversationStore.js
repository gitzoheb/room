import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Conversation identifier helper.
 * For direct chats we use `user_<otherUserId>`
 * For group chats we use `group_<groupId>`
 */
export const getConversationId = (msg, currentUserId) => {
  if (!msg) return null;
  if (msg.group) {
    const gid = typeof msg.group === 'object' ? msg.group._id : msg.group;
    return `group_${gid}`;
  }
  // Direct chat
  const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
  const receiverId = typeof msg.receiver === 'object' ? msg.receiver._id : msg.receiver;
  const otherId = senderId === currentUserId ? receiverId : senderId;
  return `user_${otherId}`;
};

const useConversationStore = create(persist((set, get) => ({
  conversations: {}, // { [conversationId]: { lastMessageAt: ISOString, unread: number } }
  activeConversationId: null,

  // Set active conversation (opened by the user)
  setActive: (conversationId) => set({ activeConversationId: conversationId }),

  // Mark a conversation as viewed, clearing unread count
  markAsRead: (conversationId) =>
    set((state) => {
      if (!conversationId) return state;
      const existing = state.conversations[conversationId];
      if (!existing) return state;
      return {
        conversations: {
          ...state.conversations,
          [conversationId]: { ...existing, unread: 0 },
        },
      };
    }),

  // Update conversation metadata when a new message arrives
  upsertFromMessage: (msg, currentUserId) => {
    const convoId = getConversationId(msg, currentUserId);
    if (!convoId) return;

    set((state) => {
      const isActive = state.activeConversationId === convoId;
      const existing = state.conversations[convoId] || { unread: 0, lastMessageAt: null, lastMessage: '' };
      // Derive a short preview of the message (fallback to [Media] when no text)
      const lastMessagePreview = (msg.text && msg.text.trim().length)
        ? msg.text
        : '[Media]';
      return {
        conversations: {
          ...state.conversations,
          [convoId]: {
            lastMessage: lastMessagePreview,
            lastMessageAt: msg.createdAt || new Date().toISOString(),
            unread: isActive ? 0 : existing.unread + 1,
          },
        },
      };
    });
  },
}), {
  name: 'conversations-store', // key in localStorage
  partialize: (state) => ({ conversations: state.conversations }), // store only conversations
}));

export default useConversationStore; 