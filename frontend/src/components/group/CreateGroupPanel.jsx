import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Users,
  Upload,
  Camera,
  X,
  Search,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import PropTypes from 'prop-types';

import useUserStore from '../../store/useUserStore';
import useGroupStore from '../../store/useGroupStore';

const CreateGroupPanel = ({ isOpen, onClose }) => {
  /* --------------------------------------------------------------------- */
  /* STORES & NAVIGATION                                                   */
  /* --------------------------------------------------------------------- */
  const navigate = useNavigate();
  const currentUser = useUserStore((state) => state.currentUser);
  const users = useUserStore((state) => state.users);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const createGroup = useGroupStore((state) => state.createGroup);

  /* --------------------------------------------------------------------- */
  /* LOCAL STATE                                                           */
  /* --------------------------------------------------------------------- */
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();

  /* --------------------------------------------------------------------- */
  /* EFFECTS                                                               */
  /* --------------------------------------------------------------------- */
  // Load users when panel mounts
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  // Ensure current user is always selected/admin
  useEffect(() => {
    if (currentUser) {
      setSelectedUsers([currentUser._id]);
    }
  }, [currentUser]);

  // Reset form when closing
  useEffect(() => {
    if (!isOpen) {
      // Give the closing animation some time before reset to avoid flash
      const t = setTimeout(() => {
        resetForm();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  /* --------------------------------------------------------------------- */
  /* HANDLERS                                                              */
  /* --------------------------------------------------------------------- */
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCancelAvatar = () => {
    setAvatar(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUserSelection = (userId) => {
    if (userId === currentUser?._id) return; // Prevent deselecting admin
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const resetForm = () => {
    setGroupName('');
    setSelectedUsers(currentUser ? [currentUser._id] : []);
    setAvatar(null);
    setAvatarPreview(null);
    setMemberQuery('');
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      return toast.error('Group name is required');
    }
    if (selectedUsers.length < 2) {
      return toast.error('A group must have at least 2 members');
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('name', groupName);
    formData.append('members', JSON.stringify(selectedUsers));
    if (avatar) {
      formData.append('avatar', avatar);
    }
    try {
      const newGroup = await createGroup(formData);
      toast.success('Group created successfully');
      if (onClose) onClose();
      resetForm();
      navigate(`/chat/group/${newGroup._id}`);
    } catch (error) {
      console.error('Failed to create group:', error);
      toast.error(error?.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------------------------- */
  /* DERIVED DATA                                                          */
  /* --------------------------------------------------------------------- */
  const otherUsers = users.filter((u) => u._id !== currentUser?._id);
  const filteredUsers = otherUsers.filter((u) => {
    const q = memberQuery.toLowerCase();
    return (u.name || u.username || '').toLowerCase().includes(q);
  });

  /* --------------------------------------------------------------------- */
  /* RENDER                                                                */
  /* --------------------------------------------------------------------- */
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 transition-opacity duration-300 z-30 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />
      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:max-w-md bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden transform transition-transform duration-500 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Panel content */}
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              Create Group
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-500 hover:text-blue-600 transition"
              title="Close"
              aria-label="Close create group panel"
            >
              <X size={20} />
            </button>
          </header>

          {/* Content */}
          <form onSubmit={handleSubmit} className="px-6 pb-32 flex-1 overflow-y-auto space-y-8">
            {/* Avatar */}
            <div className="flex justify-center mt-8 mb-8">
              <div className="relative group">
                <div className="relative w-28 h-28">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Group Avatar"
                      className="w-full h-full rounded-full object-cover shadow-lg ring-4 ring-indigo-300/60"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl text-white font-bold shadow-lg ring-4 ring-indigo-300/40">
                      <Upload size={32} />
                    </div>
                  )}
                  {/* Cancel avatar */}
                  {avatarPreview && (
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all duration-200 hover:scale-110"
                      onClick={handleCancelAvatar}
                      title="Cancel selected avatar"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {/* Upload button */}
                  <button
                    type="button"
                    className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg"
                    onClick={() => fileInputRef.current.click()}
                    title="Upload Avatar"
                  >
                    <Camera size={16} />
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>
            </div>

            {/* Group name */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-gray-800 font-medium text-sm">
                <Users size={16} /> Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200"
                placeholder="Enter group name"
                required
                aria-label="Group Name"
              />
            </div>

            {/* Member search */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-gray-800 font-medium text-sm">
                <Search size={16} /> Add Members
              </label>
              <input
                type="text"
                placeholder="Search by name..."
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200"
              />
            </div>

            {/* Member count */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Members selected: <strong>{selectedUsers.length}</strong></span>
              <span className="text-xs text-gray-400">(min 2 required)</span>
            </div>

            {/* Members list */}
            <div className="space-y-3 max-h-[32vh] overflow-y-auto pr-1">
              {/* Admin/current user */}
              {currentUser && (
                <div className="flex items-center p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm">
                  <div className="relative">
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-300"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-lg ring-2 ring-blue-300">
                        {currentUser.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                      <CheckCircle size={14} className="text-white" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-semibold text-gray-900 leading-5">{currentUser.name}</p>
                    <p className="text-sm text-blue-600 font-medium">Admin (You)</p>
                  </div>
                </div>
              )}

              {/* Other users */}
              {filteredUsers.map((user) => {
                const isSelected = selectedUsers.includes(user._id);
                return (
                  <div
                    key={user._id}
                    onClick={() => handleUserSelection(user._id)}
                    className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${isSelected
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-md hover:shadow-lg'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                  >
                    <div className="relative">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className={`w-12 h-12 rounded-full object-cover transition-all duration-200 ${isSelected ? 'ring-2 ring-green-400' : 'ring-2 ring-gray-200'
                            }`}
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-200 ${isSelected
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white ring-2 ring-green-400'
                            : 'bg-gray-200 text-gray-600 ring-2 ring-gray-200'
                          }`}>
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 transition-all duration-200">
                          <CheckCircle size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`font-medium leading-5 transition-colors duration-200 ${isSelected ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                        {user.name}
                      </p>
                      {isSelected && (
                        <p className="text-sm text-green-600 font-medium">Selected</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !groupName.trim() || selectedUsers.length < 2}
              className="w-full relative flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:hover:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Create Group"
              title={selectedUsers.length < 2 ? 'Select at least 2 members' : 'Create Group'}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Creating...
                </>
              ) : (
                <>
                  Create Group <Users className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
};

CreateGroupPanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CreateGroupPanel;