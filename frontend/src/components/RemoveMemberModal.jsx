import React, { useState, useEffect } from 'react';
import useUserStore from '../store/useUserStore';
import useGroupStore from '../store/useGroupStore';
import { toast } from 'react-hot-toast';

const RemoveMemberModal = ({ isOpen, onClose, groupId }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const { groups, removeMember } = useGroupStore();
  const { currentUser } = useUserStore();

  const group = groups.find(g => g._id === groupId);

  const handleRemoveMembers = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one member to remove.');
      return;
    }
    for (const userId of selectedUsers) {
      await removeMember(groupId, { userId, requesterId: currentUser._id });
    }
    toast.success('Members removed successfully!');
    onClose();
  };

  const members = group ? group.members : [];
  const adminId = group ? (group.admin?._id || group.admin) : null;

  // Reset selection whenever modal is closed or switched to a different group
  useEffect(() => {
    if (!isOpen) {
      setSelectedUsers([]);
    }
  }, [isOpen, groupId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-1/3">
        <h2 className="text-2xl mb-4">Remove Members</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {members.map(user => {
            const isAdmin = user._id === adminId;
            return (
              <div
                key={user._id}
                onClick={() => !isAdmin && setSelectedUsers(prev => prev.includes(user._id) ? prev.filter(id => id !== user._id) : [...prev, user._id])}
                className={`p-2 rounded-md cursor-pointer ${selectedUsers.includes(user._id) ? 'bg-red-200' : ''} ${isAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
              >
                {user.name || user.username} {isAdmin && '(Admin)'}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200">Cancel</button>
          <button onClick={handleRemoveMembers} className="px-4 py-2 rounded bg-red-500 text-white">Remove</button>
        </div>
      </div>
    </div>
  );
};

export default RemoveMemberModal; 