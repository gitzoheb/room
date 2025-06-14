import { Routes, Route } from "react-router-dom";
import CreateUser from "./pages/CreateUser";
import HomePage from "./pages/HomePage";
import { Toaster } from "react-hot-toast";
import SignIn from "./pages/SignIn";
import ProtectedRoute from "./others/ProtectedRoute";
import { useEffect } from "react";
import useUserStore from "./store/useUserStore";
import { initSocket, getSocket, disconnectSocket } from "./services/socket";
import useConversationStore from "./store/useConversationStore";

const App = () => {
  const currentUser = useUserStore((state) => state.currentUser);
  const upsertConversation = useConversationStore((state) => state.upsertFromMessage);

  useEffect(() => {
    // Disconnect any previous socket before re-establishing (relevant when userId changes)
    disconnectSocket();

    if (currentUser?._id) {
      console.log("Initializing socket for user:", currentUser._id);
      const socket = initSocket(currentUser._id);

      if (socket) {
        socket.on("connect_error", (err) => {
          console.error("Socket connection error:", err);
        });

        socket.on("connect", () => {
          console.log("Socket connected successfully");
        });

        // Global message listener for conversation tracking ONLY (do not update message list here)
        socket.on("receiveMessage", (msg) => {
          if (!currentUser?._id) return;
          upsertConversation(msg, currentUser._id);
          // Do NOT update the message list here!
        });
      }
    }

    // Cleanup on unmount or user change
    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off("receiveMessage");
        socket.off("connect_error");
        socket.off("connect");
      }
      disconnectSocket();
    };
  }, [currentUser, upsertConversation]);

  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<ProtectedRoute>
          <HomePage />
        </ProtectedRoute>} />
        <Route path="/chat/:type/:id" element={<ProtectedRoute>
          <HomePage />
        </ProtectedRoute>} />
        <Route path="/create-user" element={<CreateUser />} />
        <Route path="/sign-in" element={<SignIn />} />
      </Routes>
    </>
  );
};

export default App;
