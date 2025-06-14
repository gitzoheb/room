// src/store/useGroupStore.js
import { create } from 'zustand';
import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  getGroupMessages,
  removeGroupAvatar as removeGroupAvatarApi
} from '../services/axios';

const useGroupStore = create((set, get) => ({
  groups: [],
  hasMoreGroups: true,
  groupsPage: 1,
  groupsTotal: 0,
  activeGroup: null,
  messages: [],
  loading: false,
  error: null,

  fetchGroups: async (page = 1, limit = 20) => {
    try {
      set({ loading: true });
      const res = await getGroups({ page, limit });
      set((state) => ({
        groups: page === 1 ? res.data.groups : [...state.groups, ...res.data.groups],
        groupsPage: page,
        groupsTotal: res.data.total,
        hasMoreGroups: state.groups.length + res.data.groups.length < res.data.total,
        loading: false,
      }));
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchGroupById: async (groupId) => {
    try {
      set({ loading: true });
      const res = await getGroupById(groupId);
      set({ activeGroup: res.data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchGroupMessages: async (groupId) => {
    try {
      set({ loading: true });
      const res = await getGroupMessages(groupId);
      set({ messages: res.data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createGroup: async (data) => {
    try {
      const res = await createGroup(data);
      set((state) => ({
        groups: [res.data, ...state.groups],
      }));
      return res.data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  updateGroupById: async (groupId, data) => {
    try {
      const res = await updateGroup(groupId, data);
      set((state) => ({
        groups: state.groups.map((group) =>
          group._id === groupId ? res.data.group : group
        ),
        activeGroup: state.activeGroup && state.activeGroup._id === groupId ? res.data.group : state.activeGroup,
      }));
    } catch (err) {
      set({ error: err.message });
    }
  },

  deleteGroupById: async (groupId, data) => {
    try {
      await deleteGroup(groupId, data);
      set((state) => ({
        groups: state.groups.filter((group) => group._id !== groupId),
      }));
      set((state) => ({
        activeGroup: state.activeGroup && state.activeGroup._id === groupId ? null : state.activeGroup,
      }));
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  addMember: async (groupId, data) => {
    try {
      const res = await addMemberToGroup(groupId, data);
      set((state) => ({
        groups: state.groups.map((group) =>
          group._id === groupId ? res.data.group : group
        ),
        activeGroup: res.data.group,
      }));
    } catch (err) {
      set({ error: err.message });
    }
  },

  removeMember: async (groupId, data) => {
    try {
      const res = await removeMemberFromGroup(groupId, data);
      set((state) => ({
        groups: state.groups.map((group) =>
          group._id === groupId ? res.data.group : group
        ),
        activeGroup: res.data.group,
      }));
    } catch (err) {
      set({ error: err.message });
    }
  },

  removeGroupAvatar: async (groupId) => {
    try {
      const res = await removeGroupAvatarApi(groupId);
      set((state) => ({
        groups: state.groups.map((group) =>
          group._id === groupId ? res.data.group : group
        ),
        activeGroup: state.activeGroup && state.activeGroup._id === groupId ? res.data.group : state.activeGroup,
      }));
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  resetGroups: () => set({ groups: [], groupsPage: 1, hasMoreGroups: true, groupsTotal: 0 }),
}));

export default useGroupStore;
