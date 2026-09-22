import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Health check
  health: () => apiClient.get('/health'),

  // Guilds
  getGuilds: () => apiClient.get('/guilds'),
  getGuildChannels: (guildId) => apiClient.get(`/guilds/${guildId}/channels`),
  getGuildRoles: (guildId) => apiClient.get(`/guilds/${guildId}/roles`),
  getGuildStats: (guildId, type = 'economy', limit = 50) => 
    apiClient.get(`/guilds/${guildId}/stats`, { params: { type, limit } }),
  getGuildLeaderboard: (guildId) => 
    apiClient.get(`/guilds/${guildId}/leaderboard`),
  getGuildPunishments: (guildId, limit = 50) => 
    apiClient.get(`/guilds/${guildId}/punishments`, { params: { limit } }),
  getGuildBans: (guildId) => 
    apiClient.get(`/guilds/${guildId}/bans`),
  getGuildDeletedMessages: (guildId, limit = 100) =>
    apiClient.get(`/guilds/${guildId}/deleted-messages`, { params: { limit } }),

  // Economy
  getGlobalEconomy: (limit = 100) => 
    apiClient.get('/economy/global', { params: { limit } }),

  // Bot Settings
  getBotInfo: () => apiClient.get('/bot/info'),
  getGuildsWithInvites: () => apiClient.get('/bot/guilds/invites'),
  updateBotAvatar: (avatarUrl) => apiClient.post('/bot/avatar', { avatarUrl }),
  updateBotBanner: (bannerUrl) => apiClient.post('/bot/banner', { bannerUrl }),
  uploadBotAvatar: (formData) => apiClient.post('/bot/avatar/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadBotBanner: (formData) => apiClient.post('/bot/banner/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Direct Messages
  getBotDMs: () => apiClient.get('/bot/dms'),
  replyToDM: (userId, content, messageIds = null) => 
    apiClient.post(`/bot/dms/${userId}/reply`, { content, messageIds }),

  // Messages
  sendMessage: (data) => apiClient.post('/message/send', data),

  // User Management
  addRoleToUser: (guildId, userId, roleId) => 
    apiClient.post(`/guilds/${guildId}/members/${userId}/roles/add`, { roleId }),
  removeRoleFromUser: (guildId, userId, roleId) => 
    apiClient.post(`/guilds/${guildId}/members/${userId}/roles/remove`, { roleId }),
  banUser: (guildId, userId, reason) => 
    apiClient.post(`/guilds/${guildId}/members/${userId}/ban`, { reason }),
  unbanUser: (guildId, userId) => 
    apiClient.post(`/guilds/${guildId}/members/${userId}/unban`),
  updateUserMoney: (userId, amount) => 
    apiClient.post(`/users/${userId}/money/update`, { amount }),
};

export default apiClient;
