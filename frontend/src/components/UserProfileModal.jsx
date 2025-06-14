import React, { useState } from 'react';
import { Trash, X, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useUserStore from '../store/useUserStore';
import useChatStore from '../store/useChatStore';

const UserProfileModal = ({ user, isOpen, onClose }) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const currentUser = useUserStore((state) => state.currentUser);
  const deleteAllUserMessages = useChatStore((state) => state.deleteAllUserMessages);

  if (!user) return null;

  const handleDeleteAllMessages = async () => {
    if (!currentUser || !user._id) return;
    try {
      await deleteAllUserMessages(currentUser._id, user._id, { requesterId: currentUser._id });
      toast.success('All messages deleted for this chat');
      setDeleteConfirmOpen(false);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to delete all messages');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity duration-300 z-30 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:max-w-md bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden transform transition-transform duration-500 z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">User Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:text-blue-600 transition"
            title="Close"
            aria-label="Close user profile panel"
          >
            <X size={20} />
          </button>
        </div>
        {/* Content */}
        <div className="px-6 pb-32 overflow-y-auto flex-1 flex flex-col items-center justify-center">
          {/* Avatar & Username */}
          <div className="flex flex-col items-center mb-6">
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} className="w-24 h-24 rounded-full object-cover mb-2 border-3 border-white shadow-lg ring-3 ring-blue-100" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-4xl font-bold mb-2 border-3 border-white shadow-lg ring-3 ring-blue-100">
                {user.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <h3 className="text-xl font-semibold mb-1 text-gray-800">{user.username}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          {/* Delete all messages button */}
          <div className="flex gap-3 mb-8 justify-center flex-wrap">
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 hover:from-yellow-600 hover:to-yellow-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
              title="Delete all messages"
            >
              <Trash size={18} />
            </button>
          </div>
          {/* Delete confirmation dropdown */}
          {deleteConfirmOpen && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-5 flex flex-col items-center">
              <p className="text-base text-slate-700 mb-4 text-center">Delete all messages with <span className="font-semibold">{user.username}</span>?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleDeleteAllMessages}
                  className="px-5 py-2 text-sm rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  Yes
                </button>
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="px-5 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300 font-semibold"
                >
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default UserProfileModal; 