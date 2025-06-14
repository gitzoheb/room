import { io } from "socket.io-client";
import useUserStore from "../store/useUserStore";

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Track connection status
const connectionStatus = {
  isConnected: false,
  lastError: null,
};

export const getConnectionStatus = () => ({ ...connectionStatus });

export const initSocket = (userId) => {
  if (!userId) return null;

  // Avoid multiple connections
  if (socket && socket.connected) {
    console.log("Socket already connected, reusing connection");
    return socket;
  }
  
  // Disconnect previous socket if it exists but isn't connected
  if (socket) {
    console.log("Disconnecting previous socket instance");
    socket.disconnect();
  }

  console.log("Initializing socket connection for user:", userId);
  
  socket = io("https://room-kp5a.onrender.com", {
    // Start with HTTP long-polling to complete the Engine.IO handshake, then upgrade to WebSocket
    transports: ["polling", "websocket"],
    withCredentials: true,
    query: { userId },
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  // Handle connection events
  socket.on("connect", () => {
    console.log("Socket connected successfully");
    connectionStatus.isConnected = true;
    connectionStatus.lastError = null;
    reconnectAttempts = 0;
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err);
    connectionStatus.isConnected = false;
    connectionStatus.lastError = err.message;
    
    reconnectAttempts++;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
    connectionStatus.isConnected = false;
    
    // If the server closed the connection, don't attempt to reconnect
    if (reason === "io server disconnect") {
      console.log("Server disconnected the socket, not attempting to reconnect");
    }
  });

  // Handle global events
  socket.on("onlineUsers", (users) => {
    console.log("Online users:", users);
    // Update global store with the list of online users
    if (Array.isArray(users)) {
      useUserStore.getState().setOnlineUsers(users);
    }
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    console.log("Manually disconnecting socket");
    socket.disconnect();
    socket = null;
    connectionStatus.isConnected = false;
  }
};

export const isSocketConnected = () => {
  return socket && socket.connected;
}; 
