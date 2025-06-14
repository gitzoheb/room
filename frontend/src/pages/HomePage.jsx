import React, { useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import UserSetting from "../components/user/UserSetting";
import CreateGroupPanel from "../components/group/CreateGroupPanel";

const HomePage = () => {
  const { type, id } = useParams(); // type: "user" or "group", id: the selected id

  // Control visibility of settings drawer
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-gray-50">
      <Sidebar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
      />
      <div className="flex-1 flex flex-col h-screen">
        {id ? (
          <ChatContainer chatType={type} chatId={id} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-lg">
            Select a chat to start messaging
          </div>
        )}
      </div>
      {/* Settings Drawer */}
      {isSettingsOpen && (
        <UserSetting onClose={() => setIsSettingsOpen(false)} />
      )}
      {/* Create Group Drawer */}
      {isCreateGroupOpen && (
        <CreateGroupPanel isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} />
      )}
    </div>
  );
};

export default HomePage;
