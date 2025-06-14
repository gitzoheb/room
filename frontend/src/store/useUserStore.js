// store/useUserStore.js
import { create } from 'zustand';
import {
  createUser,
  getUsers,
  getUserById,
  searchUsers,
  updateUserById,
  deleteUserById,
  getUserGroups,
} from '../services/axios';

const useUserStore = create((set, get) => ({
  users: [],
  currentUser: JSON.parse(localStorage.getItem('user')) || null,
  userGroups: [],
  loading: false,
  error: null,

  // Added online users state
  onlineUsers: [],

  // Function to update the list of online users
  setOnlineUsers: (users) => set({ onlineUsers: users }),

  hasMoreUsers: true,
  usersPage: 1,
  usersTotal: 0,

  fetchUsers: async (page = 1, limit = 20) => {
    set({ loading: true });
    try {
      const res = await getUsers({ page, limit });
      set((state) => ({
        users: page === 1 ? res.data.users : [...state.users, ...res.data.users],
        usersPage: page,
        usersTotal: res.data.total,
        hasMoreUsers: state.users.length + res.data.users.length < res.data.total,
        loading: false,
      }));
    } catch (err) {
      console.error(err);
      set({ error: err, loading: false });
    }
  },

  fetchUserById: async (id) => {
    set({ loading: true });
    try {
      const res = await getUserById(id);
      return res.data;
    } catch (err) {
      console.error(err);
      set({ error: err });
    } finally {
      set({ loading: false });
    }
  },

  createNewUser: async (data) => {
    try {
      const res = await createUser(data);
      const user = res?.data?.user || res.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ currentUser: user });
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message || "Username already exists or invalid input";
      throw new Error(errorMessage); // 👈 throw for component to catch
    }
  },

  updateUser: async (id, data) => {
    try {
      const res = await updateUserById(id, data);
      set((state) => ({
        users: state.users.map((u) => (u._id === id ? res.data : u)),
      }));
    } catch (err) {
      console.error(err);
      set({ error: err });
    }
  },

  deleteUser: async (id) => {
    try {
      await deleteUserById(id);
      set((state) => ({
        users: state.users.filter((u) => u._id !== id),
      }));
    } catch (err) {
      console.error(err);
      set({ error: err });
    }
  },

  searchUser: async (query) => {
    try {
      const res = await searchUsers(query);
      return res.data;
    } catch (err) {
      console.error(err);
      set({ error: err });
    }
  },

  fetchUserGroups: async (userId) => {
    try {
      const res = await getUserGroups(userId);
      set({ userGroups: res.data });
    } catch (err) {
      console.error(err);
      set({ error: err });
    }
  },

  setCurrentUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ currentUser: user });
  },

  logout: () => {
    localStorage.removeItem('user');
    set({ currentUser: null });
  },

  resetUsers: () => set({ users: [], usersPage: 1, hasMoreUsers: true, usersTotal: 0 }),
}));

export default useUserStore;
