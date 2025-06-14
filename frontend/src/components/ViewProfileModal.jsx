import React, { useState } from 'react';

const ViewProfileModal = ({ isOpen, onClose, members, adminId }) => {
  const [selectedUser, setSelectedUser] = useState(null);

  // Support both populated admin object and ID string
  const adminIdStr = adminId?._id || adminId;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white p-6 rounded-lg w-1/3" onClick={e => e.stopPropagation()}>
          <h2 className="text-2xl mb-4">Group Members</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {members.map(member => (
              <div key={member._id} onClick={() => setSelectedUser(member)} className="flex items-center space-x-4 p-2 rounded-md cursor-pointer hover:bg-gray-100">
                <img src={member.avatar} alt={member.username} className="w-10 h-10 rounded-full" />
                <span>{member.username} {member._id === adminIdStr && '(Admin)'}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200">Close</button>
          </div>
        </div>
      </div>
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedUser(null)}>
          <div className="bg-white p-6 rounded-lg w-1/3" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl mb-4">{selectedUser.username}'s Profile</h2>
            <div className="flex items-center space-x-4">
              <img src={selectedUser.avatar} alt={selectedUser.username} className="w-16 h-16 rounded-full" />
              <div>
                <p><strong>Username:</strong> {selectedUser.username}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setSelectedUser(null)} className="px-4 py-2 rounded bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ViewProfileModal; 