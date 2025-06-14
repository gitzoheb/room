import React, { useMemo, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Users, UserPlus, UserMinus, Edit, Trash2, X, Camera, Crown, Shield, Settings, MessageCircle } from 'lucide-react';
import useUserStore from '../../store/useUserStore';
import useChatStore from '../../store/useChatStore';
import useGroupStore from '../../store/useGroupStore';
import { toast } from 'react-hot-toast';

const GroupInfoPanel = ({
  isOpen,
  onClose,
  group,
  currentUserId,
  onAddMember,
  onRemoveMember,
  onDeleteGroup,
}) => {
  /* --------------------------------------------------------------------- */
  /* DERIVED DATA                                                          */
  /* --------------------------------------------------------------------- */
  const { users } = useUserStore();
  const { deleteAllGroupMessages } = useChatStore();
  const { updateGroupById, removeGroupAvatar } = useGroupStore();

  // Dropdown state for adding member
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Local state for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState('');

  // Ref for the dropdown so we can detect outside-clicks
  const editDropdownRef = useRef(null);
  const addDropdownRef = useRef(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (editDropdownRef.current && !editDropdownRef.current.contains(e.target)) {
        setIsEditMode(false);
      }
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target)) {
        setShowAddDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isAdmin = useMemo(() => {
    if (!group || !currentUserId) return false;
    const adminId = group.admin?._id || group.admin;
    return adminId === currentUserId;
  }, [group, currentUserId]);

  const members = useMemo(() => {
    if (!group) return [];
    return group.members.map((m) => (typeof m === 'string' ? users.find((u) => u._id === m) || { _id: m, username: 'Unknown' } : m));
  }, [group, users]);

  // Compute users not in the group
  const nonMembers = useMemo(() => {
    if (!group) return [];
    const memberIds = group.members.map(m => (typeof m === 'string' ? m : m._id));
    return users.filter(u => !memberIds.includes(u._id));
  }, [group, users]);

  // When toggling edit mode on/group changes, seed form values
  useEffect(() => {
    if (group && isEditMode) {
      setEditName(group.name);
      setEditAvatarPreview(group.avatar || '');
      setEditAvatarFile(null);
    }
  }, [group, isEditMode]);

  const handleEditSave = async () => {
    if (!group) return;

    const formData = new FormData();
    if (editName && editName !== group.name) formData.append('name', editName);
    if (editAvatarFile) formData.append('avatar', editAvatarFile);

    if ([...formData.keys()].length === 0) {
      setIsEditMode(false);
      return;
    }

    try {
      await updateGroupById(group._id, formData);
      toast.success('Group updated successfully!');
      setIsEditMode(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update group');
    }
  };

  /* --------------------------------------------------------------------- */
  /* HANDLERS                                                              */
  /* --------------------------------------------------------------------- */
  const handleDeleteAllMessages = async () => {
    if (!group) return;
    const confirmed = window.confirm('Delete all messages in this group? This action cannot be undone.');
    if (!confirmed) return;
    try {
      await deleteAllGroupMessages(group._id, { requesterId: currentUserId });
    } catch (err) {
      console.error('Failed to delete messages:', err);
    }
  };

  // Handler for removing a member
  const handleRemoveMember = (userId) => {
    if (onRemoveMember) {
      onRemoveMember(userId);
    }
  };

  const handleRemoveAvatar = async () => {
    if (group?.avatar) {
      try {
        await removeGroupAvatar(group._id);
        toast.success('Avatar removed');
      } catch (err) {
        toast.error(err.message || 'Failed to remove avatar');
      }
    }
    setEditAvatarPreview('');
    setEditAvatarFile(null);
  };

  /* --------------------------------------------------------------------- */
  /* RENDER                                                                */
  /* --------------------------------------------------------------------- */
  if (!group) return null;

  return (
    <>
      {/* Enhanced Backdrop with Blur */}
      <div
        className={`fixed inset-0 transition-all duration-500 z-30 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Enhanced Drawer with Glass Effect */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:max-w-lg bg-white/95 backdrop-blur-xl shadow-2xl ring-1 ring-white/20 overflow-hidden z-50 ${
          isOpen ? '' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full relative">
          {/* Gradient Background Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-blue-100/30 pointer-events-none" />
          
          {/* Enhanced Header with Gradient */}
          <header className="relative flex items-center justify-between px-6 py-5 bg-white text-gray-800 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Group Settings</h2>
            <button
              className="p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
              onClick={onClose}
              title="Close"
            >
              <X size={20} />
            </button>
          </header>

          {/* Enhanced Content with Better Spacing */}
          <div className="flex-1 overflow-y-auto relative">
            {/* Enhanced Edit Form Overlay */}
            {isEditMode && (
              <div className="absolute inset-0 z-20 bg-gradient-to-br from-blue-50 to-indigo-100 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-white/20">
                  {/* Edit Header */}
                  <div className="flex items-center justify-between px-6 py-4 bg-white text-gray-800 border-b border-gray-200 rounded-t-2xl">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Edit size={16} />
                      Edit Group
                    </h3>
                    <button
                      className="p-2 rounded-full hover:bg-gray-100 transition-all duration-200"
                      onClick={() => setIsEditMode(false)}
                      title="Close edit form"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Form Body */}
                  <div className="p-6 space-y-6">
                    {/* Enhanced Avatar Section */}
                    <div className="flex justify-center">
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                        {editAvatarPreview ? (
                          <img
                            src={editAvatarPreview}
                            alt="avatar preview"
                            className="relative w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-xl"
                          />
                        ) : (
                          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl ring-4 ring-white">
                            {(editName || group.name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        
                        {/* Enhanced Remove Button */}
                        {(editAvatarPreview || group.avatar) && (
                          <button
                            type="button"
                            className="absolute -top-1 -left-1 p-1.5 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-110 opacity-0 group-hover:opacity-100"
                            onClick={handleRemoveAvatar}
                            title="Remove avatar"
                          >
                            <X size={12} />
                          </button>
                        )}

                        {/* Enhanced Camera Button */}
                        <label className="absolute -bottom-1 -right-1 p-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 transform hover:scale-110 opacity-0 group-hover:opacity-100">
                          <Camera size={14} />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setEditAvatarFile(file);
                                setEditAvatarPreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Enhanced Input */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Group Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Enter group name"
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white/80"
                      />
                    </div>
                  </div>

                  {/* Enhanced Footer */}
                  <div className="px-6 py-4 bg-gray-50/80 rounded-b-2xl flex justify-end gap-3">
                    <button
                      className="px-6 py-2.5 rounded-xl bg-white text-gray-700 hover:bg-gray-100 shadow-sm transition-all duration-200 font-medium"
                      onClick={() => setIsEditMode(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all duration-200 font-medium transform hover:scale-105"
                      onClick={handleEditSave}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 space-y-8 pb-32 relative">
              {/* Enhanced Group Header */}
              <section className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-200/10 rounded-2xl blur-sm"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 ring-1 ring-white/20">
                  <div className="flex items-center gap-6">
                    {/* Enhanced Avatar */}
                    <div className="relative">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full blur opacity-20"></div>
                {group.avatar ? (
                  <img
                    src={group.avatar.startsWith('http') || group.avatar.startsWith('/') ? group.avatar : `/${group.avatar}`}
                    alt={group.name}
                    className="relative w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-xl"
                  />
                ) : (
                        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl ring-4 ring-white">
                    {(group.name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-gray-900">{group.name}</h3>
                        {isAdmin && (
                          <div className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-gradient-to-r from-amber-100 to-yellow-100 px-3 py-1 rounded-full ring-1 ring-amber-200">
                            <Crown size={12} />
                            Admin
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users size={14} />
                          <span>{members.length} member{members.length !== 1 && 's'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle size={14} />
                          <span>Group Chat</span>
                        </div>
                      </div>
                </div>
              </div>
                  
              {group.description && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl border border-gray-200/50">
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {group.description}
                </p>
                    </div>
              )}
                </div>
            </section>

              {/* Enhanced Members Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2 text-lg">
                    <Users size={20} className="text-blue-500" />
                    Members
              </h4>
                  {isAdmin && (
                    <div className="relative" ref={addDropdownRef}>
                      <button
                        onClick={() => setShowAddDropdown(v => !v)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700"
                        type="button"
                      >
                        <UserPlus size={16} />
                        Add Member
                      </button>
                      {showAddDropdown && (
                        <div className="absolute right-0 z-10 mt-3 w-64 bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-2xl ring-1 ring-white/20 p-3 max-h-64 overflow-y-auto">
                          {nonMembers.length === 0 ? (
                            <div className="text-gray-500 text-sm px-3 py-2 text-center">
                              No users available to add
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {nonMembers.map(user => (
                                <div key={user._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-blue-50/50 transition-all duration-200 group">
                                  <span className="font-medium text-gray-700 truncate">
                                    {user.name || user.username}
                                  </span>
                                  <button
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
                                    onClick={() => {
                                      if (onAddMember) onAddMember(user._id);
                                      setShowAddDropdown(false);
                                    }}
                                  >
                                    Add
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl ring-1 ring-white/20">
                  <div>
                    {members.map((member, index) => {
                  const adminId = group.admin?._id || group.admin;
                  const isMemberAdmin = member._id === adminId;
                  return (
                    <div
                      key={member._id}
                          className={`flex items-center justify-between p-4 hover:bg-blue-50/50 transition-all duration-200 ${
                            index !== members.length - 1 ? 'border-b border-gray-200/50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                              {(member.name || member.username || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 truncate">
                                  {member.name || member.username}
                      </span>
                                {isMemberAdmin && (
                                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                    <Crown size={10} />
                                    Admin
                                  </div>
                                )}
                                {member._id === currentUserId && (
                                  <div className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                    You
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                      {isAdmin && !isMemberAdmin && (
                        <button
                              className="p-2 rounded-full hover:bg-red-100 text-red-500 hover:text-red-600 transition-all duration-200 transform hover:scale-110"
                          onClick={() => handleRemoveMember(member._id)}
                          title="Remove member"
                        >
                          <UserMinus size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
                </div>
              </section>

              {/* Enhanced Admin Actions */}
              {isAdmin && (
                <section className="space-y-4">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2 text-lg">
                    <Shield size={20} className="text-blue-500" />
                    Admin Actions
                  </h4>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg ring-1 ring-white/20 overflow-hidden">
                    <div className="space-y-1 p-2">
                    <button
                        onClick={() => setIsEditMode(true)}
                        className="flex w-full items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 text-gray-700 font-medium transition-all duration-200 group"
                      type="button"
                    >
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors duration-200">
                          <Edit size={16} />
                        </div>
                        <span>Edit Group Settings</span>
                                </button>
                      
                  <button
                    onClick={handleDeleteAllMessages}
                        className="flex w-full items-center gap-3 px-4 py-3 rounded-xl hover:bg-yellow-50 text-gray-700 font-medium transition-all duration-200 group"
                  >
                        <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600 group-hover:bg-yellow-200 transition-colors duration-200">
                          <MessageCircle size={16} />
                        </div>
                        <span>Clear All Messages</span>
                  </button>
                      
                  <button
                    onClick={() => {
                      const confirmed = window.confirm('Are you sure you want to delete this group? This action cannot be undone.');
                      if (confirmed && onDeleteGroup) onDeleteGroup();
                    }}
                        className="flex w-full items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 font-medium transition-all duration-200 group"
                  >
                        <div className="p-2 rounded-lg bg-red-100 text-red-600 group-hover:bg-red-200 transition-colors duration-200">
                          <Trash2 size={16} />
                        </div>
                        <span>Delete Group</span>
                  </button>
                    </div>
                </div>
              </section>
            )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

GroupInfoPanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  group: PropTypes.object,
  currentUserId: PropTypes.string,
  onAddMember: PropTypes.func,
  onRemoveMember: PropTypes.func,
  onDeleteGroup: PropTypes.func,
};

export default GroupInfoPanel;