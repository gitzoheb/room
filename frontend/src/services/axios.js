import axios from 'axios';

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Add request interceptor to include user ID in headers
API.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user && user._id) {
      config.headers['x-user-id'] = user._id;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// USER APIs
export const createUser = (data) => API.post('/users', data);
export const getUsers = (params = {}) => API.get('/users', { params });
export const getUserById = (id) => API.get(`/users/${id}`);
export const searchUsers = (query) => API.get(`/users/search?q=${query}`);
export const updateUserById = (id, data) => API.put(`/users/${id}`, data);
export const deleteUserById = (id) => API.delete(`/users/${id}`);
export const addUserToGroup = (userId, groupId, data) => API.post(`/users/${userId}/groups/${groupId}`, data);
export const removeUserFromGroup = (userId, groupId) => API.delete(`/users/${userId}/groups/${groupId}`);
export const getUserGroups = (userId) => API.get(`/users/${userId}/groups`);

// GROUP APIs
export const createGroup = (data) => API.post('/groups', data);
export const getGroups = (params = {}) => API.get('/groups', { params });
export const getGroupById = (groupId) => API.get(`/groups/${groupId}`);
export const updateGroup = (groupId, data) => API.patch(`/groups/${groupId}`, data);
export const deleteGroup = (groupId, data) => API.delete(`/groups/${groupId}`, { data });
export const addMemberToGroup = (groupId, data) => API.patch(`/groups/${groupId}/add-member`, data);
export const removeMemberFromGroup = (groupId, data) => API.patch(`/groups/${groupId}/remove-member`, data);
export const removeGroupAvatar = (groupId) => API.patch(`/groups/${groupId}/remove-avatar`);

// MESSAGE APIs
export const sendMessage = (data, isFormData = false) => {
  // When `data` is an instance of FormData, let Axios set the content-type
  // header (including the multipart boundary) automatically. Manually
  // specifying it omits the boundary and causes the request to be parsed
  // incorrectly on the server.
  if (isFormData) {
    return API.post('/messages', data);
  }
  return API.post('/messages', data);
};

export const getMessagesBetweenUsers = (user1Id, user2Id, params = {}) => API.get(`/messages/user/${user1Id}/${user2Id}`, { params });
export const getGroupMessages = (groupId, params = {}) => API.get(`/messages/group/${groupId}`, { params });
export const sendGroupMessage = (groupId, data, isFormData = false) => {
  if (isFormData) {
    return API.post('/messages', data);
  }
  return API.post('/messages', data);
};
export const deleteMessage = (messageId, data) => API.delete(`/messages/${messageId}`, { data });
export const updateMessage = (messageId, data) => API.patch(`/messages/${messageId}`, data);
export const markMessageAsRead = (messageId, data) => API.patch(`/messages/${messageId}/read`, data);
export const reactToMessage = (messageId, data) => API.patch(`/messages/${messageId}/react`, data);
export const deleteAllGroupMessages = (groupId, data) => API.delete(`/messages/group/${groupId}/all`, { data });
export const deleteAllUserMessages = (user1Id, user2Id, data) => API.delete(`/messages/user/${user1Id}/${user2Id}/all`, { data });
export const pinMessage = (messageId, data) => API.patch(`/messages/${messageId}/pin`, data);
export const unpinMessage = (messageId, data) => API.patch(`/messages/${messageId}/unpin`, data);
export const getPinnedMessages = () => API.get('/messages/pinned');

export default API;
