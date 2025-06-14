import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MoreVertical, Paperclip, Smile, Send, Reply, Copy, Trash2, Pencil, Info, Pin, X, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import useUserStore from '../store/useUserStore';
import useGroupStore from '../store/useGroupStore';
import useChatStore from '../store/useChatStore';
import EmojiPicker from 'emoji-picker-react';
import { toast } from 'react-hot-toast';
import AddMemberModal from '../components/AddMemberModal';
import RemoveMemberModal from '../components/RemoveMemberModal';
import ViewProfileModal from '../components/ViewProfileModal';
import UserProfileModal from '../components/UserProfileModal';
import GroupInfoPanel from './group/GroupInfoPanel';
import { getSocket } from '../services/socket';
import useConversationStore from '../store/useConversationStore';
import { generateLocalId } from '../store/useChatStore';
import GroupMediaGalleryPanel from './group/GroupMediaGalleryPanel';

const ChatContainer = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const userId = type === 'user' ? id : null;
  const groupId = type === 'group' ? id : null;

  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [isViewProfileModalOpen, setIsViewProfileModalOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [isInfoMenuOpen, setIsInfoMenuOpen] = useState(false);
  const infoMenuRef = useRef(null);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastHoveredMsgId, setLastHoveredMsgId] = useState(null);
  const [isPinnedPanelOpen, setIsPinnedPanelOpen] = useState(false);
  const [isMediaPanelOpen, setIsMediaPanelOpen] = useState(false);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const currentUser = useUserStore((state) => state.currentUser);
  const { deleteGroupById, addMember, removeMember } = useGroupStore();
  const users = useUserStore((state) => state.users);
  const onlineUsers = useUserStore((state) => state.onlineUsers);
  const groups = useGroupStore((state) => state.groups);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const fetchGroups = useGroupStore((state) => state.fetchGroups);

  const messages = useChatStore((state) => state.messages);
  const fetchDirectMessages = useChatStore((state) => state.fetchDirectMessages);
  const fetchGroupMessages = useChatStore((state) => state.fetchGroupMessages);
  const hasMoreMessages = useChatStore((state) => state.hasMoreMessages);
  const resetMessages = useChatStore((state) => state.resetMessages);
  const sendDirectMessage = useChatStore((state) => state.sendDirectMessage);
  const sendGroupMessage = useChatStore((state) => state.sendGroupMessage);
  const clearMessages = useChatStore((state) => state.clearMessages);
  const deleteChatMessage = useChatStore((state) => state.deleteChatMessage);
  const updateChatMessage = useChatStore((state) => state.updateChatMessage);
  const addIncomingMessage = useChatStore((state) => state.addIncomingMessage);
  const { pinChatMessage, unpinChatMessage, forwardMessage, updateMessageStatus } = useChatStore();
  const addPendingMessage = useChatStore((state) => state.addPendingMessage);
  const replaceMessageByLocalId = useChatStore((state) => state.replaceMessageByLocalId);
  const markMessageFailed = useChatStore((state) => state.markMessageFailed);

  // Conversation store helpers
  const setActiveConversation = useConversationStore((state) => state.setActive);
  const markConversationRead = useConversationStore((state) => state.markAsRead);

  // Key used for persisting messages for this particular conversation
  const conversationKey = userId ? `user_${userId}` : groupId ? `group_${groupId}` : null;

  const messagesContainerRef = useRef(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, [fetchUsers, fetchGroups]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (infoMenuRef.current && !infoMenuRef.current.contains(event.target)) {
        setIsInfoMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    resetMessages();
    if (userId && currentUser?._id) {
      fetchDirectMessages(currentUser._id, userId, { limit: 20 });
    } else if (groupId) {
      fetchGroupMessages(groupId, { limit: 20 });
    }
  }, [userId, groupId, currentUser, fetchDirectMessages, fetchGroupMessages, resetMessages]);

  useEffect(() => {
    if (!messagesEndRef.current || !messagesContainerRef.current || messages.length === 0) return;

    const el = messagesContainerRef.current;

    if (firstLoadRef.current) {
        el.scrollTop = el.scrollHeight;
    } else {
        // Determine if we should auto-scroll for new messages
        const lastMsg = messages[messages.length - 1];
        const isSentByMe = lastMsg && ((lastMsg.sender?._id || lastMsg.sender) === currentUser._id);
        const distanceFromBottom = el.scrollHeight - el.clientHeight - el.scrollTop;
        const isNearBottom = distanceFromBottom < 120; // px threshold

        if (isSentByMe || isNearBottom) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }

    firstLoadRef.current = false;
  }, [messages, currentUser._id]);

  // Socket: join room and handle incoming messages for this chat
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // --- Helper handlers --------------------------------------------------
    const handleIncoming = (msg) => {
      // Check if message is for the current group chat
      const isForCurrentGroupChat = groupId && (msg.group?._id === groupId || msg.group === groupId);
      
      // Check if message is for the current direct chat
      const isForCurrentDirectChat = userId &&
        (
          ((msg.sender?._id || msg.sender) === currentUser?._id && (msg.receiver?._id || msg.receiver) === userId) ||
          ((msg.sender?._id || msg.sender) === userId && (msg.receiver?._id || msg.receiver) === currentUser?._id)
        );

      if (isForCurrentDirectChat || isForCurrentGroupChat) {
        addIncomingMessage(msg);
      }
    };

    const handleTyping = ({ typing, fromUserId }) => {
        if (userId === fromUserId) {
            setIsTyping(typing);
        }
    };

    const handleMessageStatus = ({ messageId, status }) => {
      updateMessageStatus(messageId, status);
    };

    // --- Attach listeners -----------------
    const attachListeners = () => {
      if (groupId) socket.emit("joinRoom", groupId);
      if (userId) socket.emit('joinRoom', `user_${currentUser._id}`);

      socket.on("receiveMessage", handleIncoming);
      socket.on('typing', handleTyping);
      socket.on('messageStatus', handleMessageStatus);
    };

    if (socket.connected) {
      attachListeners();
    } else {
      socket.once('connect', attachListeners);
    }

    // --- Cleanup ----------------------------------------------------------
    return () => {
      socket.off("receiveMessage", handleIncoming);
      socket.off('typing', handleTyping);
      socket.off('messageStatus', handleMessageStatus);

      if (groupId) socket.emit("leaveRoom", groupId);
      if (userId) socket.emit('leaveRoom', `user_${currentUser._id}`);
    };
  }, [userId, groupId, currentUser?._id, addIncomingMessage, updateMessageStatus]);

  // When route (conversation) changes, mark as active and read
  useEffect(() => {
    if (!currentUser?._id) return;
    let convoId = null;
    if (userId) {
      convoId = `user_${userId}`;
    } else if (groupId) {
      convoId = `group_${groupId}`;
    }
    if (convoId) {
      setActiveConversation(convoId);
      markConversationRead(convoId);
    }

    // On unmount, clear active convo if this was active
    return () => {
      setActiveConversation(null);
    };
  }, [userId, groupId, currentUser?._id, setActiveConversation, markConversationRead]);

  // Persist messages to LocalStorage --------------------------------------
  useEffect(() => {
    if (!conversationKey) return;

    // Load cached messages on first render for this conversation
    const raw = localStorage.getItem(`messages_${conversationKey}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          // Ensure messages are in chronological order (oldest -> newest) and
          // discard messages that are older than 45 days so the cache never
          // stores messages beyond our retention policy.
          const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000;
          const ordered = [...parsed]
            .filter((m) => new Date(m.createdAt).getTime() >= cutoff)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          // Directly replace the current message list with cached data
          useChatStore.setState({ messages: ordered });
        }
      } catch (err) {
        console.error('Failed to parse cached messages:', err);
      }
    }
  }, [conversationKey]);

  // Whenever messages change, write them to LocalStorage
  useEffect(() => {
    if (!conversationKey) return;
    try {
      if (messages && messages.length) {
        const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000;
        const pruned = messages.filter((m) => new Date(m.createdAt).getTime() >= cutoff);
        localStorage.setItem(`messages_${conversationKey}`, JSON.stringify(pruned));
      }
    } catch (err) {
      // Fail silently but log for development
      console.error('Failed to cache messages:', err);
    }
  }, [messages, conversationKey]);

  const selectedUser = users.find((user) => user._id === userId);
  const selectedGroup = groups.find((group) => group._id === groupId);

  const displayName = selectedUser?.name || selectedUser?.username || selectedGroup?.name || 'Select a Chat';
  const displayAvatar = selectedUser?.avatar || selectedGroup?.avatar;

  // Determine if the selected direct chat user is online
  const isSelectedUserOnline = React.useMemo(() => {
    if (!selectedUser) return false;
    return onlineUsers.includes(selectedUser._id);
  }, [onlineUsers, selectedUser]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return; // no files picked or user canceled

    // Update selected files list
    setSelectedFiles((prev) => [...prev, ...files]);

    // Allow picking the same file again later by resetting the input
    e.target.value = null;
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() && selectedFiles.length === 0) return;

    let payload;
    let isFormData = selectedFiles.length > 0;

    // Generate a localId for optimistic message
    const localId = generateLocalId();
    const now = new Date().toISOString();

    // Prepare optimistic message
    const optimisticMsg = {
      localId,
      sender: currentUser._id,
      text: message,
      createdAt: now,
      pending: true,
      failed: false,
      media: [],
      replyTo: replyTo ? { ...replyTo } : null,
      receiver: userId || null,
      group: groupId || null,
    };
    if (selectedFiles.length > 0) {
      optimisticMsg.media = selectedFiles.map((file) => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'file',
      }));
    }

    // Add optimistic message to store
    addPendingMessage(optimisticMsg);

    if (isFormData) {
      payload = new FormData();
      payload.append('sender', currentUser._id);
      payload.append('text', message || "");
      if (replyTo) payload.append('replyTo', replyTo._id || replyTo.id);
      selectedFiles.forEach((file) => payload.append('media', file));
      if (userId) payload.append('receiver', userId);
      if (groupId) payload.append('group', groupId);
    } else {
      payload = {
        sender: currentUser._id,
        text: message,
      };
      if (replyTo) payload.replyTo = replyTo._id || replyTo.id;
      if (userId) payload.receiver = userId;
      if (groupId) payload.group = groupId;
    }

    try {
      let resp;
      if (userId) {
        resp = await sendDirectMessage(payload, isFormData);
        // Update conversation metadata immediately
        const upsertConversation = useConversationStore.getState().upsertFromMessage;
        upsertConversation({
          createdAt: now,
          sender: currentUser._id,
          receiver: userId,
          text: message,
        }, currentUser._id);
      } else if (groupId) {
        resp = await sendGroupMessage(groupId, payload, isFormData);
        const upsertConversation = useConversationStore.getState().upsertFromMessage;
        upsertConversation({
          createdAt: now,
          group: groupId,
          sender: currentUser._id,
          text: message,
        }, currentUser._id);
      }
      // REST responses are wrapped (resp.data.data) whereas socket ACKs may return
      // the message object directly (resp.data). Extract correctly before replacing.
      let confirmedMsg = null;
      if (resp?.data?.data) {
        confirmedMsg = resp.data.data;          // Axios REST response
      } else if (resp?.data) {
        confirmedMsg = resp.data;               // Socket ACK path
      }

      if (confirmedMsg) {
        replaceMessageByLocalId(localId, { ...confirmedMsg, pending: false, failed: false });
      }
    } catch (err) {
      // Mark optimistic message as failed
      markMessageFailed(localId);
      toast.error('Failed to send message');
    }

    setMessage('');
    setShowEmoji(false);
    setReplyTo(null);
    setSelectedFiles([]);
    inputRef.current?.focus();
  };

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  // Helper: get sender info for group messages
  const getSenderInfo = (msg) => {
    const senderId = msg.sender?._id || msg.sender;
    if (senderId === currentUser?._id) return currentUser;

    if (groupId) {
      return users.find((u) => u._id === senderId) || { username: 'Unknown', _id: 'unknown' };
    }
    return selectedUser || { username: 'Unknown', _id: 'unknown' };
  };

  // Helper: returns a consistent text color based on sender ID (used in group chats)
  const getSenderColor = (senderId) => {
    if (!senderId) return 'text-gray-500';

    if (groupId && selectedGroup) {
      const adminId = selectedGroup.admin?._id || selectedGroup.admin;
      if (senderId === adminId) {
        return 'text-red-500 font-semibold';
      }
      return 'text-yellow-600';
    }

    const colors = ['text-red-500', 'text-green-500', 'text-blue-500', 'text-purple-500', 'text-pink-500'];
    const index = senderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Helper: show clock time for messages < 1 day old; otherwise show day count (e.g., "1 day", "3 days")
  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 1) {
      return diffDays === 1 ? '1 day' : `${diffDays} days`;
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  let typingTimeout = null;
  const handleTypingChange = (e) => {
    const socket = getSocket();
    if (!socket) return;

    setMessage(e.target.value);

    // Inform other user that I'm typing
    socket.emit('typing', { toUserId: userId, fromUserId: currentUser._id, typing: true });

    // Clear previous timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }

    // Set a timeout to emit 'stop typing' event
    typingTimeout = setTimeout(() => {
        socket.emit('typing', { toUserId: userId, fromUserId: currentUser._id, typing: false });
    }, 2000); // 2 seconds of inactivity
  };

  // Add missing action handlers ------------------------------------------------
  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Message copied to clipboard'))
      .catch(() => toast.error('Failed to copy message'));
  };

  const handleReply = (msg) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  const handleDelete = async (messageId) => {
    try {
      await deleteChatMessage(messageId, { sender: currentUser._id });
      toast.success('Message deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete message');
    }
  };

  const handleEdit = (msg) => {
    setEditingMsgId(msg._id || msg.id);
    setEditText(msg.text);
    inputRef.current?.focus();
  };

  const handleEditSave = async (msg) => {
    const id = msg._id || msg.id;
    if (!editText.trim()) return;
    try {
      await updateChatMessage(id, { newText: editText, sender: currentUser._id });
      setEditingMsgId(null);
      setEditText('');
      toast.success('Message updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update message');
    }
  };

  const handleEditCancel = () => {
    setEditingMsgId(null);
    setEditText('');
  };

  // Pin or unpin a message --------------------------------------------------
  const handlePin = async (msg) => {
    await pinChatMessage(msg._id, { userId: currentUser._id });
  };

  const handleUnpin = async (msg) => {
    await unpinChatMessage(msg._id, { userId: currentUser._id });
  };

  // Get pinned messages (for group or DM)
  const pinnedMessages = messages.filter((msg) => msg.isPinned);

  // Flattened list of media items for gallery (applies to both group and direct chats)
  const mediaItems = useMemo(() => {
    const items = [];
    messages.forEach((m) => {
      if (m.media && m.media.length > 0) {
        m.media.forEach((mediaObj, idx) => {
          items.push({
            url: mediaObj.url,
            type: mediaObj.type || (mediaObj.url.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image' : 'file'),
            senderName: users.find(u => u._id === (m.sender?._id || m.sender))?.name || '',
            _id: `${m._id || m.id || m.localId}_${idx}`,
          });
        });
      }
    });
    // Newest first
    return items.reverse();
  }, [messages, users]);

  // Add emoji bar above the input area:
  const emojiBar = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥"];

  // Add this after selectedGroup is defined:
  const adminId = selectedGroup && (selectedGroup.admin?._id || selectedGroup.admin);

  // Infinite scroll handler for messages
  const handleMessagesScroll = async () => {
    const el = messagesContainerRef.current;
    if (!el || isFetchingMore) return;

    if (el.scrollTop < 100 && hasMoreMessages && messages.length > 0) {
      setIsFetchingMore(true);
      const oldest = messages[0];
      const before = oldest.createdAt;
      if (userId && currentUser?._id) {
        await fetchDirectMessages(currentUser._id, userId, { limit: 20, before });
      } else if (groupId) {
        await fetchGroupMessages(groupId, { limit: 20, before });
      }
      setIsFetchingMore(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {isAddMemberModalOpen && (
        <AddMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          groupId={groupId}
        />
      )}
      {isRemoveMemberModalOpen && (
        <RemoveMemberModal
          isOpen={isRemoveMemberModalOpen}
          onClose={() => setIsRemoveMemberModalOpen(false)}
          groupId={groupId}
        />
      )}
      {isViewProfileModalOpen && (
        <ViewProfileModal
          isOpen={isViewProfileModalOpen}
          onClose={() => setIsViewProfileModalOpen(false)}
          members={selectedGroup ? selectedGroup.members : []}
          adminId={selectedGroup ? (selectedGroup.admin?._id || selectedGroup.admin) : null}
        />
      )}
      {selectedUserProfile && (
        <UserProfileModal
          user={selectedUserProfile}
          isOpen={!!selectedUserProfile}
          onClose={() => setSelectedUserProfile(null)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold overflow-hidden cursor-pointer" onClick={() => selectedUser && setSelectedUserProfile(selectedUser)}>
            {displayAvatar ? (
              <img src={displayAvatar} alt={displayName} className="w-10 h-10 object-cover rounded-full" />
            ) : (
              displayName.charAt(0)?.toUpperCase()
            )}
          </div>
          <div>
            <h2 className="font-semibold cursor-pointer" onClick={() => selectedUser && setSelectedUserProfile(selectedUser)}>{displayName}</h2>
            {selectedGroup ? (
              <p className="text-xs text-gray-500">
                {selectedGroup.members.length} member{selectedGroup.members.length !== 1 ? 's' : ''}
              </p>
            ) : isTyping ? (
              <p className="text-xs text-green-500 italic">Typing...</p>
            ) : (
              <p className="text-xs text-gray-500">{isSelectedUserOnline ? 'Online' : 'Offline'}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          <div className="relative" ref={infoMenuRef}>
            <button
              type="button"
              className="p-1 rounded-full hover:bg-gray-200 text-gray-600"
              onClick={() => setIsInfoMenuOpen((v) => !v)}
            >
              <MoreVertical size={22} />
            </button>
            <div
              className={`absolute right-0 z-10 mt-2 w-48 origin-top-right transform rounded-md bg-white shadow-lg transition-all duration-200 ease-in-out ${
                isInfoMenuOpen
                  ? 'translate-y-0 scale-100 opacity-100'
                  : '-translate-y-2 scale-95 opacity-0 pointer-events-none'
              }`}
            >
              <div className="p-1">
                {selectedGroup ? (
                  <>
                    <button
                      onClick={() => {
                        setIsGroupInfoOpen(true);
                        setIsInfoMenuOpen(false);
                      }}
                      className="flex items-center w-full gap-2 px-2 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100"
                    >
                      <Info size={16} />
                      Info
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedUserProfile(selectedUser);
                      setIsInfoMenuOpen(false);
                    }}
                    className="flex items-center w-full gap-2 px-2 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100"
                  >
                    <Info size={16} />
                    Profile
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsPinnedPanelOpen(true);
                    setIsInfoMenuOpen(false);
                  }}
                  className="flex items-center w-full gap-2 px-2 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <Pin size={16} />
                  Pinned Messages
                </button>
                {(selectedGroup || selectedUser) && (
                  <button
                    onClick={() => {
                      setIsMediaPanelOpen(true);
                      setIsInfoMenuOpen(false);
                    }}
                    className="flex items-center w-full gap-2 px-2 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100"
                  >
                    <ImageIcon size={16} />
                    Media Gallery
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-gray-100" ref={messagesContainerRef} onScroll={handleMessagesScroll}>
        {/* Pinned messages banner removed as per requirement */}
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">No messages yet</div>
        ) : (
          messages.map((msg) => {
            const isSent = (msg.sender?._id || msg.sender) === currentUser._id;
            const sender = getSenderInfo(msg);
            const msgId = msg._id || msg.id || msg.localId;
            const isEditing = editingMsgId === msgId;

            return (
              <div
                key={msgId}
                className={`flex flex-col group ${isSent ? 'items-end' : 'items-start'}`}
                onMouseEnter={() => { setHoveredMsgId(msgId); setLastHoveredMsgId(msgId); }}
                onMouseLeave={() => setHoveredMsgId(null)}
              >
                {!isSent && groupId && (
                  <div className="text-xs text-gray-500 self-start ml-12 mb-1">
                    <span className={getSenderColor(sender._id)}>{sender.name || sender.username}</span>
                  </div>
                )}
                <div className={`flex items-end gap-2 max-w-full ${isSent ? 'justify-end' : 'justify-start'}`}>
                  {/* Avatar for received messages in group chat */}
                  {!isSent && groupId && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => setSelectedUserProfile(sender)}>
                      {sender.avatar ? (
                        <img src={sender.avatar} alt={sender.name || sender.username} className="w-8 h-8 object-cover rounded-full" />
                      ) : (
                        <span className="text-blue-700 font-bold text-base">
                          {(sender.name || sender.username)?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                  <div
                    className={`relative px-4 pt-2 pb-4 rounded-3xl shadow-sm transition-colors duration-200
                      ${isSent
                        ? 'bg-white text-gray-900 border border-gray-200 rounded-br-none'
                        : 'bg-blue-500 text-white rounded-bl-none'}
                      max-w-[75%] sm:max-w-md break-words`
                    }
                    onContextMenu={(e) => {
                      /* Reaction feature removed */
                      e.preventDefault();
                    }}
                  >
                    {/* Reply preview in message bubble */}
                    {msg.replyTo && (
                      <div className={`mb-1 px-2 py-1 rounded bg-blue-100 text-xs text-blue-800 border-l-4 border-blue-400 ${!isSent ? 'bg-opacity-30' : ''}`}>
                        <span className="font-semibold mr-1">
                          {msg.replyTo.sender?.name || msg.replyTo.sender?.username || 'User'}:
                        </span>
                        {msg.replyTo.text}
                      </div>
                    )}
                    {msg.forwardedFrom && msg.forwardedFrom.originalSender && (
                      <div className={`mb-1 px-2 py-1 rounded bg-gray-200 text-xs text-gray-700 border-l-4 border-gray-400 ${!isSent ? 'bg-opacity-30' : ''}`}>
                        <span className="font-semibold mr-1">Forwarded from {users.find(u => u._id === (msg.forwardedFrom.originalSender?._id || msg.forwardedFrom.originalSender))?.name || 'User'}:</span>
                        {msg.forwardedFrom.originalMessage?.text ? (
                          <span className="italic">{msg.forwardedFrom.originalMessage.text.slice(0, 50)}{msg.forwardedFrom.originalMessage.text.length > 50 ? '...' : ''}</span>
                        ) : (
                          <span className="italic text-gray-500">[Media]</span>
                        )}
                      </div>
                    )}
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <input
                          className="input input-bordered w-full"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleEditSave(msg);
                            if (e.key === 'Escape') handleEditCancel();
                          }}
                        />
                        <div className="flex gap-2 justify-end">
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => handleEditSave(msg)}>
                            Save
                          </button>
                          <button type="button" className="btn btn-sm btn-ghost" onClick={handleEditCancel}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-base">{msg.text}</p>
                        {msg.edited && <span className="text-xs text-gray-400 ml-2">(edited)</span>}
                        {/* Pending/Failed indicators */}
                        {msg.pending && (
                          <span className={`ml-2 align-middle text-xs inline-flex items-center gap-1 ${isSent ? 'text-blue-400' : 'text-blue-400'}`}><Loader2 className="animate-spin" size={16} /> Sending...</span>
                        )}
                        {msg.failed && (
                          <span className="ml-2 align-middle text-xs text-red-500 inline-flex items-center gap-1">
                            <AlertCircle size={16} /> Failed
                            <button
                              className="ml-1 underline text-xs text-red-500 hover:text-red-700"
                              onClick={() => {
                                // Resend logic: re-invoke handleSendMessage with the same content
                                setMessage(msg.text);
                                setReplyTo(msg.replyTo || null);
                                setSelectedFiles([]); // Can't resend files from blob, user must reattach
                                setTimeout(() => {
                                  handleSendMessage({ preventDefault: () => {} });
                                }, 0);
                              }}
                              title="Resend"
                            >
                              Retry
                            </button>
                          </span>
                        )}
                      </>
                    )}
                    {msg.media && msg.media.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.media.map((m, i) => (
                          <div key={i} className="max-w-xs">
                            {m.type === 'image' ? (
                              <img
                                src={m.url}
                                alt="media"
                                className="rounded max-h-40 cursor-pointer"
                                onClick={() => setImagePreviewUrl(m.url)}
                              />
                            ) : m.type === 'video' ? (
                              <video src={m.url} controls className="rounded max-h-40" />
                            ) : (
                              <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{m.url.split('/').pop()}</a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Timestamp bottom-right */}
                    <span className={`absolute bottom-1 right-3 text-[10px] select-none ${isSent ? 'text-gray-500' : 'text-white/80'}`}>
                      {formatTimestamp(msg.createdAt)}
                    </span>
                  </div>
                  {/* Avatar for sent messages in group chat (now on right) */}
                  {isSent && groupId && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {currentUser.avatar ? (
                        <img src={currentUser.avatar} alt={currentUser.name || currentUser.username} className="w-8 h-8 object-cover rounded-full" />
                      ) : (
                        <span className="text-blue-700 font-bold text-base">
                          {(currentUser.name || currentUser.username)?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* Message Actions (copy/reply/edit/delete) below the bubble */}
                <div
                  className={`flex gap-2 mt-1 text-gray-500 ${isSent ? 'justify-end' : 'justify-start'} ${hoveredMsgId === msgId ? 'opacity-100' : 'opacity-0 pointer-events-none'} group-hover:opacity-100 transition-opacity duration-200`}
                >
                  <button
                    className="p-1 hover:bg-gray-100 rounded"
                    onClick={() => handleCopy(msg.text)}
                    title="Copy"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="p-1 hover:bg-gray-100 rounded"
                    onClick={() => handleReply(msg)}
                    title="Reply"
                  >
                    <Reply size={16} />
                  </button>
                  {((groupId && adminId === currentUser._id) || (!groupId && ((msg.sender?._id || msg.sender) === currentUser._id || (msg.receiver?._id || msg.receiver) === currentUser._id))) && (
                    <button
                      className="p-1 hover:bg-gray-100 rounded"
                      onClick={() => msg.isPinned ? handleUnpin(msg) : handlePin(msg)}
                      title={msg.isPinned ? 'Unpin' : 'Pin'}
                      aria-label={msg.isPinned ? 'Unpin message' : 'Pin message'}
                      type="button"
                    >
                      <Pin size={16} {...(msg.isPinned ? { fill: 'currentColor' } : {})} />
                    </button>
                  )}
                  {isSent && (
                    <>
                      <button
                        className="p-1 hover:bg-gray-100 rounded"
                        onClick={() => handleEdit(msg)}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="p-1 hover:bg-gray-100 rounded"
                        onClick={() => handleDelete(msgId)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {(userId || groupId) && (
        <div className="p-4 border-t border-gray-200 bg-white shadow-lg">
          {/* Reply preview above input */}
          {replyTo && (
            <div className="flex items-center mb-2 px-3 py-2 bg-blue-50 border-l-4 border-blue-400 rounded">
              <div className="flex-1">
                <span className="font-semibold text-blue-700 mr-2">
                  Replying to {replyTo.sender?.name || replyTo.sender?.username || 'User'}:
                </span>
                <span className="text-gray-700">{replyTo.text}</span>
              </div>
              <button
                className="ml-2 text-gray-400 hover:text-gray-700"
                onClick={() => setReplyTo(null)}
                title="Cancel reply"
              >
                ×
              </button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={userId ? handleTypingChange : (e) => setMessage(e.target.value)}
                placeholder="Type a message"
                className="w-full px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm bg-gray-50"
                onFocus={() => setShowEmoji(false)}
              />
              {showEmoji && (
                <div className="absolute bottom-12 right-0 z-50">
                  <EmojiPicker onEmojiClick={handleEmojiClick} height={350} width={300} />
                </div>
              )}
              {/* File previews */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="relative flex items-center">
                      {file.type.startsWith('image') ? (
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-12 h-12 object-cover rounded" />
                      ) : file.type.startsWith('video') ? (
                        <video src={URL.createObjectURL(file)} className="w-12 h-12 object-cover rounded" controls />
                      ) : (
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">{file.name}</span>
                      )}
                      <button type="button" className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-xs shadow" onClick={() => handleRemoveFile(idx)} title="Remove file">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 ml-2">
              <label className="text-gray-500 hover:text-gray-700 cursor-pointer">
                <Paperclip size={24} />
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowEmoji((v) => !v)}
                tabIndex={-1}
              >
                <Smile size={20} />
              </button>
              <button
                type="submit"
                className="p-2 rounded-full bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-md hover:bg-blue-700 transition"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Group Info Panel */}
      {selectedGroup && (
        <GroupInfoPanel
          isOpen={isGroupInfoOpen}
          onClose={() => setIsGroupInfoOpen(false)}
          group={selectedGroup}
          currentUserId={currentUser ? currentUser._id : null}
          onAddMember={async (userId) => {
            await addMember(groupId, { userId, requesterId: currentUser._id });
            toast.success('Member added');
          }}
          onRemoveMember={async (userId) => {
            await removeMember(groupId, { userId, requesterId: currentUser._id });
            toast.success('Member removed');
          }}
          onDeleteGroup={async () => {
            await deleteGroupById(groupId, { requesterId: currentUser._id });
            toast.success('Group deleted successfully!');
            setIsGroupInfoOpen(false);
            navigate('/');
          }}
        />
      )}

      {/* Pinned Messages Side Panel */}
      {isPinnedPanelOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:max-w-md bg-white shadow-2xl ring-1 ring-black/10 z-50 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Pin size={20} className="text-yellow-500" />
              Pinned Messages
            </h2>
            <button
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition"
              onClick={() => setIsPinnedPanelOpen(false)}
              title="Close"
              aria-label="Close pinned messages panel"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {pinnedMessages.length === 0 ? (
              <div className="text-gray-400 text-center mt-10">No pinned messages</div>
            ) : (
              pinnedMessages.map((msg) => (
                <div key={msg._id} className="p-4 bg-gray-50 rounded shadow border border-gray-200 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700 flex-1 truncate">{msg.text || '[Media]'}</span>
                    <button
                      className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600"
                      onClick={() => handleUnpin(msg)}
                      title="Unpin"
                      aria-label="Unpin message"
                      type="button"
                    >
                      <Pin size={16} fill="currentColor" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    {users.find(u => u._id === (msg.sender?._id || msg.sender))?.name || 'User'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Media Gallery Side Panel (group chats only) */}
      {isMediaPanelOpen && (
        <GroupMediaGalleryPanel
          isOpen={isMediaPanelOpen}
          onClose={() => setIsMediaPanelOpen(false)}
          mediaItems={mediaItems}
          onImageClick={(url) => setImagePreviewUrl(url)}
        />
      )}

      {/* Image Preview Overlay */}
      {imagePreviewUrl && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[60]"
          onClick={() => setImagePreviewUrl(null)}
        >
          <img
            src={imagePreviewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
          />
          <button
            type="button"
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 p-2 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              setImagePreviewUrl(null);
            }}
            aria-label="Close image preview"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
