import React, { useState, useEffect } from 'react';
import useUserStore from '../store/useUserStore';
import useGroupStore from '../store/useGroupStore';
import { toast } from 'react-hot-toast';

const AddMemberModal = ({ isOpen, onClose, groupId }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const { users } = useUserStore();
  const { groups, addMember } = useGroupStore();
  const { currentUser } = useUserStore();

  const group = groups.find(g => g._id === groupId);

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one member to add.');
      return;
    }
    for (const userId of selectedUsers) {
      await addMember(groupId, { userId, requesterId: currentUser._id });
    }
    toast.success('Members added successfully!');
    onClose();
  };

  const nonMembers = group
    ? users.filter(user => !group.members.some(member => member._id === user._id))
    : [];

  // Reset selection whenever modal is reopened or switched to a different group
  useEffect(() => {
    if (!isOpen) {
      setSelectedUsers([]);
    }
  }, [isOpen, groupId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-1/3">
        <h2 className="text-2xl mb-4">Add Members</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {nonMembers.map(user => (
            <div
              key={user._id}
              onClick={() => setSelectedUsers(prev => prev.includes(user._id) ? prev.filter(id => id !== user._id) : [...prev, user._id])}
              className={`p-2 rounded-md cursor-pointer ${selectedUsers.includes(user._id) ? 'bg-blue-200' : 'hover:bg-gray-100'}`}
            >
              {user.name || user.username}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200">Cancel</button>
          <button onClick={handleAddMembers} className="px-4 py-2 rounded bg-blue-500 text-white">Add</button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal; 