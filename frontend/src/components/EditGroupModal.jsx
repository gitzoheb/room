import React, { useState, useEffect } from 'react';
import useGroupStore from '../store/useGroupStore';
import { toast } from 'react-hot-toast';

const EditGroupModal = ({ isOpen, onClose, groupId }) => {
  const { groups, updateGroupById } = useGroupStore();
  const group = groups.find(g => g._id === groupId);

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (group && isOpen) {
      setName(group.name);
      setAvatarPreview(group.avatar);
      setAvatar(null);
    }
  }, [group, isOpen]);

  const handleUpdate = async () => {
    const formData = new FormData();
    formData.append('name', name);
    if (avatar) {
      formData.append('avatar', avatar);
    }
    await updateGroupById(groupId, formData);
    toast.success('Group updated successfully!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-1/3">
        <h2 className="text-2xl mb-4">Edit Group</h2>
        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <div className="flex items-center space-x-4">
            <img src={avatarPreview} alt="Avatar" className="w-16 h-16 rounded-full" />
            <input
              type="file"
              onChange={(e) => {
                setAvatar(e.target.files[0]);
                setAvatarPreview(URL.createObjectURL(e.target.files[0]));
              }}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200">Cancel</button>
          <button onClick={handleUpdate} className="px-4 py-2 rounded bg-blue-500 text-white">Update</button>
        </div>
      </div>
    </div>
  );
};

export default EditGroupModal; 