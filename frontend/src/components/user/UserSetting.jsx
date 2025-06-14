import React, { useState, useRef, useEffect } from 'react';
import useUserStore from '../../store/useUserStore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Camera,
  User,
  Edit3,
  Lock,
  Check,
  Loader2,
} from 'lucide-react';
import PropTypes from 'prop-types';

const UserSetting = ({ onClose }) => {
  const currentUser = useUserStore((state) => state.currentUser);
  const updateUser = useUserStore((state) => state.updateUser);
  const setCurrentUser = useUserStore((state) => state.setCurrentUser);
  const navigate = useNavigate();

  const [name, setName] = useState(currentUser?.name || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();

  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => setIsOpen(true), []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => (onClose ? onClose() : navigate('/')), 300);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatar(URL.createObjectURL(file));
    }
  };

  const handleCancelAvatar = () => {
    setAvatarFile(null);
    setAvatar(currentUser?.avatar || '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let avatarUrl = currentUser.avatar;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const res = await fetch(`/api/upload/avatar`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload avatar');
        const data = await res.json();
        avatarUrl = data.url;
      } else if (!avatar) {
        avatarUrl = '';
      }
      await updateUser(currentUser._id, { name, avatar: avatarUrl });
      setCurrentUser({ ...currentUser, name, avatar: avatarUrl });
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`fixed inset-0 transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={handleClose} />

      <div className={`fixed right-0 top-0 h-full w-full sm:w-[440px] bg-white dark:bg-zinc-900 shadow-lg z-50 transform transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">User Settings</h1>
            <button onClick={handleClose} className="text-zinc-600 hover:text-blue-500 dark:text-zinc-300">
              <X size={20} />
            </button>
          </div>

          <div className="flex justify-center mb-6">
            <div className="relative">
              {avatar ? (
                <img src={avatar} alt="avatar" className="w-28 h-28 rounded-full object-cover ring-4 ring-blue-400 shadow-lg" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {currentUser?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              { (avatar || avatarFile) && (
                <button
                  type="button"
                  onClick={avatarFile ? handleCancelAvatar : handleRemoveAvatar}
                  className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow"
                >
                  <X size={14} />
                </button>
              ) }
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow"
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2 mb-1">
                <User size={14} /> Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={currentUser?.username || ''}
                  disabled
                  className="w-full px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-300 dark:border-zinc-700"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={14} />
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2 mb-1">
                <Edit3 size={14} /> Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your display name"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all disabled:opacity-50"
            >
              {loading ? <><Loader2 className="animate-spin" size={16} /> Saving...</> : <>Save Changes <Check size={16} /></>}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

UserSetting.propTypes = {
  onClose: PropTypes.func,
};

export default UserSetting;
