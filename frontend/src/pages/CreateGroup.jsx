import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Users, Upload, ArrowLeft, Camera, X, Loader2, Search, Check } from 'lucide-react';

import useUserStore from '../store/useUserStore';
import useGroupStore from '../store/useGroupStore';

const CreateGroup = () => {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const currentUser = useUserStore((state) => state.currentUser);
  const users = useUserStore((state) => state.users);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const createGroup = useGroupStore((state) => state.createGroup);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    // Automatically add the current user to the selected users list
    if (currentUser) {
      setSelectedUsers([currentUser._id]);
    }
  }, [currentUser]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUserSelection = (userId) => {
    if (userId === currentUser?._id) return; // Prevent deselecting the admin
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      return toast.error('Group name is required');
    }
    if (selectedUsers.length < 2) {
      return toast.error('A group must have at least 2 members');
    }

    const formData = new FormData();
    formData.append('name', groupName);
    formData.append('members', JSON.stringify(selectedUsers));
    if (avatar) {
      formData.append('avatar', avatar);
    }
    
    try {
      await createGroup(formData);
      toast.success('Group created successfully!');
      navigate('/');
    } catch (error) {
      console.error('Failed to create group:', error);
      toast.error(error.response?.data?.message || 'Failed to create group');
    }
  };
  
  // Exclude the admin (current user)
  const otherUsers = users.filter(user => user._id !== currentUser?._id);

  // Filter users based on search term (UI only)
  const filteredUsers = otherUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Convenience list of selected user objects (for chips)
  const selectedUserObjects = users.filter(user => selectedUsers.includes(user._id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            className="group flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium transition-all duration-200 hover:gap-3"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} className="transition-transform duration-200 group-hover:-translate-x-1" />
            Back
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 transition-all duration-300 hover:shadow-2xl relative">
          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Create New Group
            </h2>
            <p className="text-slate-500 mt-1 text-sm">Set a name, avatar and choose members</p>
          </div>

          {/* Avatar Section */}
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="relative w-24 h-24">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Group Avatar"
                    className="w-24 h-24 rounded-full object-cover border-3 border-white shadow-lg ring-3 ring-blue-100 transition-all duration-300 group-hover:ring-blue-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white shadow-lg ring-3 ring-blue-100 transition-all duration-300 group-hover:ring-blue-200">
                    <Upload size={28} />
                  </div>
                )}

                {/* Cancel Button */}
                {avatarPreview && (
                  <button
                    type="button"
                    className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all duration-200 hover:scale-110"
                    onClick={() => {
                      setAvatar(null);
                      setAvatarPreview(null);
                    }}
                    title="Remove selected avatar"
                  >
                    <X size={14} />
                  </button>
                )}

                {/* Edit / Upload Button */}
                <button
                  type="button"
                  className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-2 rounded-full"
                  onClick={() => document.getElementById('avatar-upload').click()}
                  title="Upload Avatar"
                >
                  <Camera size={14} />
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Group Name */}
            <div className="space-y-1">
              <label className="text-slate-700 font-medium text-sm">Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-800 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-100 focus:border-blue-400 hover:border-slate-300 text-sm"
                placeholder="Enter group name"
                required
              />
            </div>

            {/* Members Selection */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Select Members</h3>

              {/* Search */}
              <div className="relative mb-4">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white placeholder:text-slate-400"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Selected members chips */}
              {selectedUserObjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedUserObjects.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-1 bg-blue-100 border border-blue-300 text-slate-800 px-2 py-1 rounded-full text-xs"
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>{user.name.split(' ')[0]}</span>
                      {user._id !== currentUser?._id && (
                        <button
                          type="button"
                          onClick={() => handleUserSelection(user._id)}
                          className="ml-1 text-slate-500 hover:text-red-500"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Members list */}
              <div className="grid grid-cols-2 gap-3">
                {/* Current user (admin) */}
                {currentUser && (
                  <div className="flex items-center p-3 rounded-lg bg-blue-100 border border-blue-300">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center font-bold text-sm text-blue-700">
                        {currentUser.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="ml-2 text-xs">
                      <p className="font-medium text-slate-800 leading-4">{currentUser.name}</p>
                      <span className="text-slate-500">Admin</span>
                    </div>
                  </div>
                )}

                {/* Other users */}
                {filteredUsers.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleUserSelection(user._id)}
                    className={`relative flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 text-sm border-2 ${
                      selectedUsers.includes(user._id)
                        ? 'bg-green-50 border-green-300 hover:bg-green-100'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="ml-2 text-slate-800 truncate">{user.name}</span>

                    {/* Check mark overlay */}
                    {selectedUsers.includes(user._id) && (
                      <span className="absolute top-1 right-1 text-green-600">
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:cursor-not-allowed group"
            >
              {false && (
                <Loader2 className="animate-spin h-4 w-4 text-white" />
              )}
              <span className="flex items-center justify-center gap-2 text-sm">
                <Users size={16} />
                Create Group
              </span>
            </button>
          </form>

          {/* Hidden file input */}
          <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>
    </div>
  );
};

export default CreateGroup; 