import React, { useEffect, useState, useRef } from "react";
import { LogOut, User, Users, ListFilter, Pin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import PropTypes from 'prop-types';

import SearchInput from "./sidebar/SearchInput.jsx";
import useUserStore from "../store/useUserStore";
import useGroupStore from "../store/useGroupStore";
import UserProfileModal from "./UserProfileModal";
import useConversationStore from "../store/useConversationStore";
import usePinnedStore from "../store/usePinnedStore";

const Sidebar = ({ onOpenSettings, onOpenCreateGroup }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const users = useUserStore((state) => state.users);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const hasMoreUsers = useUserStore((state) => state.hasMoreUsers);
  const usersPage = useUserStore((state) => state.usersPage);
  const resetUsers = useUserStore((state) => state.resetUsers);
  const currentUser = useUserStore((state) => state.currentUser);
  const logout = useUserStore((state) => state.logout);

  const groups = useGroupStore((state) => state.groups);
  const fetchGroups = useGroupStore((state) => state.fetchGroups);
  const hasMoreGroups = useGroupStore((state) => state.hasMoreGroups);
  const groupsPage = useGroupStore((state) => state.groupsPage);
  const resetGroups = useGroupStore((state) => state.resetGroups);

  const conversations = useConversationStore((state) => state.conversations);
  const markConversationRead = useConversationStore((state) => state.markAsRead);

  const pinnedMessages = usePinnedStore((state) => state.pinnedMessages);
  const fetchPinnedMessages = usePinnedStore((state) => state.fetchPinnedMessages);

  const listRef = useRef(null);

  // Dropdown state for filter menu
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    resetUsers();
    resetGroups();
    fetchUsers(1);
    fetchGroups(1);
  }, [fetchUsers, fetchGroups, resetUsers, resetGroups]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debugging logs
  // console.log("Users:", users);
  // console.log("Groups:", groups);

  const filteredUsers = users
    .filter((user) => user._id !== currentUser?._id)
    .filter((user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .map((user) => ({ ...user, type: "user" }));

  const filteredGroups = groups
    .filter((group) =>
      group.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .map((group) => ({ ...group, type: "group" }));

    let combinedList = [];
    if (filter === 'all') {
      combinedList = [...filteredUsers, ...filteredGroups];
    } else if (filter === 'users') {
      combinedList = filteredUsers;
    } else if (filter === 'groups') {
      combinedList = filteredGroups;
    } else if (filter === 'pinned') {
      combinedList = pinnedMessages
        .filter((msg) => (msg.text || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .map((msg) => {
          const isGroup = !!msg.group;
          let partnerUser = null;
          if (!isGroup) {
            const senderId = (msg.sender?._id || msg.sender);
            const receiverId = (msg.receiver?._id || msg.receiver);
            partnerUser = senderId === currentUser?._id ? msg.receiver : msg.sender;
          }

          return {
            ...msg,
            type: 'pinned',
            conversationType: isGroup ? 'group' : 'user',
            conversationId: isGroup ? (msg.group?._id || msg.group) : (partnerUser?._id || partnerUser),
            displayName: isGroup ? (msg.group?.name || '[Group]') : (partnerUser?.name || partnerUser?.username || 'User'),
          };
        });
    }

  // Helper to get conversation id
  const getConvId = (item) => (item.type === 'user' ? `user_${item._id}` : `group_${item._id}`);

  // Sort combined list based on last message time or pinned timestamp
  if (filter === 'pinned') {
    combinedList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else {
    combinedList.sort((a, b) => {
      const convA = conversations[getConvId(a)];
      const convB = conversations[getConvId(b)];
      const timeA = convA?.lastMessageAt ? new Date(convA.lastMessageAt).getTime() : 0;
      const timeB = convB?.lastMessageAt ? new Date(convB.lastMessageAt).getTime() : 0;
      return timeB - timeA; // Descending (latest first)
    });
  }

  // Infinite scroll handler
  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      // Near bottom
      if (hasMoreUsers) fetchUsers(usersPage + 1);
      if (hasMoreGroups) fetchGroups(groupsPage + 1);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully!");
    navigate("/create-user");
  };

  // Helper to format timestamps (shows time for today, otherwise short date)
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    // If the message is from today, show HH:MM
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Otherwise, show DD MMM (e.g., 04 Jun)
    return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
  };

  return (
    <div className="w-78 bg-[#F3F2F5] h-screen flex flex-col border-r border-gray-200">
      {selectedUserProfile && (
        <UserProfileModal
          user={selectedUserProfile}
          onClose={() => setSelectedUserProfile(null)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-300">
        <h1 className="text-lg font-semibold text-gray-800">Chat</h1>
        <div className="flex items-center gap-2">
          {/* Create Group Icon */}
          <button
            className="p-1 rounded-full hover:bg-green-100 text-green-600"
            aria-label="Create Group"
            title="Create Group"
            onClick={() => {
              if (onOpenCreateGroup) {
                onOpenCreateGroup();
              } else {
                navigate('/create-group');
              }
            }}
          >
            <Users size={18} />
          </button>
          {/* Filter Icon & Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              className="p-1 rounded-full hover:bg-gray-200 text-gray-600"
              aria-label="Filter"
              title="Filter"
              onClick={() => setIsFilterOpen((prev) => !prev)}
            >
              <ListFilter size={18} />
            </button>

            {/* Dropdown */}
            <div
              className={`absolute right-0 z-10 mt-2 w-36 origin-top-right transform rounded-md bg-white shadow-lg transition-all duration-200 ease-in-out dark:bg-zinc-800 ${
                isFilterOpen
                  ? "translate-y-0 scale-100 opacity-100"
                  : "-translate-y-2 scale-95 opacity-0 pointer-events-none"
              }`}
            >
              <div className="p-1">
                <button
                  onClick={() => {
                    setFilter('all');
                    setIsFilterOpen(false);
                  }}
                  className="flex items-center w-full gap-2 px-2 py-1.5 text-sm text-gray-700 rounded-md dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setFilter('users');
                    setIsFilterOpen(false);
                  }}
                  className="flex items-center w-full gap-2 px-2 py-1.5 text-sm text-gray-700 rounded-md dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                  <User size={14} />
                  Users
                </button>
                <button
                  onClick={() => {
                    setFilter('groups');
                    setIsFilterOpen(false);
                  }}
                  className="flex items-center w-full gap-2 px-2 py-1.5 text-sm text-gray-700 rounded-md dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                  <Users size={14} />
                  Groups
                </button>
                <button
                  onClick={() => {
                    setFilter('pinned');
                    fetchPinnedMessages();
                    setIsFilterOpen(false);
                  }}
                  className="flex items-center w-full gap-2 px-2 py-1.5 text-sm text-gray-700 rounded-md dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                  <Pin size={14} />
                  Pinned
                </button>
                <div className="my-1 border-t border-gray-200 dark:border-zinc-700"></div>
                <button
                  onClick={() => {
                    setIsFilterOpen(false);
                    if (onOpenSettings) {
                      onOpenSettings();
                    }
                  }}
                  className="flex items-center w-full gap-2 px-2 py-1.5 text-sm text-gray-700 rounded-md dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                  <User size={14} />
                  My Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Combined List */}
      <div className="flex-1 overflow-y-auto" ref={listRef} onScroll={handleScroll}>
        {combinedList.length === 0 && (
          <p className="text-center text-sm text-gray-500 mt-4">
            No users or groups found
          </p>
        )}
        {combinedList.map((item) => (
          <div
            key={item._id}
            className={`flex items-center px-4 py-3 cursor-pointer transition duration-150 select-none rounded-lg mx-2 mb-1 ${
              selectedUserId === item._id
                ? "bg-white shadow-md border border-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() => {
              if (item.type === 'pinned') {
                if (item.conversationType === 'group') {
                  navigate(`/chat/group/${item.conversationId}`);
                } else {
                  setSelectedUserId(item.conversationId);
                  navigate(`/chat/user/${item.conversationId}`);
                }
                setFilter('all');
              } else {
                markConversationRead(getConvId(item));
                if (item.type === 'user') {
                  setSelectedUserId(item._id);
                  navigate(`/chat/user/${item._id}`);
                } else {
                  setSelectedUserId(item._id);
                  navigate(`/chat/group/${item._id}`);
                }
              }
            }}
          >
            {item.type === 'pinned' ? (
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-yellow-200 text-yellow-800 mr-3">
                <Pin size={18} />
              </div>
            ) : (
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full text-xl mr-3 relative ${
                  item.type === "user" ? "bg-blue-100" : "bg-gradient-to-br from-green-400 to-green-600"
                }`}
              >
                {item.avatar ? (
                  <img
                    src={item.avatar}
                    alt={item.name || item.username}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-white font-semibold">
                    {(item.name || item.username).charAt(0).toUpperCase()}
                  </span>
                )}
                {item.type === 'group' && (
                  <span className="absolute bottom-0 right-0 bg-white rounded-full p-0.5 shadow">
                    <Users size={12} className="text-green-600" />
                  </span>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {item.type === 'pinned' ? (
                <p className="text-sm font-medium text-gray-800 truncate">
                  {item.displayName}
                </p>
              ) : (
                // Name row with time on the right
                (() => {
                  const convMeta = conversations[getConvId(item)];
                  return (
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-gray-800 truncate flex-1">
                        {item.name}
                      </p>
                      {convMeta?.lastMessageAt && (
                        <span className="ml-2 text-xs text-gray-400 whitespace-nowrap">
                          {formatTime(convMeta.lastMessageAt)}
                        </span>
                      )}
                    </div>
                  );
                })()
              )}
              {item.type === 'pinned' ? (
                <p className="text-xs text-gray-500 truncate">{item.text || '[Media]'}</p>
              ) : (
                (() => {
                  const convMeta = conversations[getConvId(item)];
                  if (!convMeta) {
                    return (
                      <p className="text-xs text-gray-500 truncate">No messages yet</p>
                    );
                  }

                  const unread = convMeta.unread || 0;
                  return (
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500 truncate flex-1">
                        {convMeta.lastMessage || 'No messages yet'}
                      </p>
                      {unread > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium leading-none text-white bg-green-500 rounded-full">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Current User Badge at Bottom */}
      {currentUser && (
        <div className="mt-auto border-t border-gray-200 px-4 py-3 bg-white flex items-center gap-3 shadow-inner">
          <div className="relative">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name || currentUser.username}
                className="w-10 h-10 rounded-full object-cover border border-gray-300"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-blue-700 font-bold text-lg">
                  {(currentUser.name || currentUser.username)?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {/* Status dot */}
            <span className="absolute bottom-0 right-0 block w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-base font-semibold text-gray-900 truncate">{currentUser.name || currentUser.username}</span>
            <span className="text-xs text-gray-500 truncate">{currentUser.email}</span>
          </div>
          <div className="relative group">
            <button
              className="p-2 rounded-full hover:bg-red-100 text-red-500 transition-colors"
              aria-label="Logout"
              onClick={handleLogout}
            >
              <LogOut size={20} />
            </button>
            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
              Logout
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

Sidebar.propTypes = {
  onOpenSettings: PropTypes.func,
  onOpenCreateGroup: PropTypes.func,
};

export default Sidebar;
