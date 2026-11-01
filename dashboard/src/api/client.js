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
  getGuildGameStats: (guildId) =>
    apiClient.get(`/guilds/${guildId}/game-stats`),
  getGuildPunishments: (guildId, limit = 50) => 
    apiClient.get(`/guilds/${guildId}/punishments`, { params: { limit } }),
  getSiciller: (guildId, limit = 100, offset = 0) =>
    apiClient.get(`/guilds/${guildId}/siciller`, { params: { limit, offset } }),
  getGuildBans: (guildId) => 
    apiClient.get(`/guilds/${guildId}/bans`),
  getGuildDeletedMessages: (guildId, limit = 100) =>
    apiClient.get(`/guilds/${guildId}/deleted-messages`, { params: { limit } }),
  getGuildChannelMessages: (guildId, channelId, limit = 50) =>
    apiClient.get(`/guilds/${guildId}/channels/${channelId}/messages`, { params: { limit } }),

  // Economy
  getGlobalEconomy: (limit = 100) => 
    apiClient.get('/economy/global', { params: { limit } }),

  // Banks
  getBanks: () => apiClient.get('/banks'),
  getBankDetail: (bankId) => apiClient.get(`/banks/${bankId}`),
  updateBankRates: (bankId, rates) => apiClient.put(`/banks/${bankId}/rates`, rates),
  deleteBank: (bankId) => apiClient.delete(`/banks/${bankId}`),

  // Bot Settings
  getBotInfo: () => apiClient.get('/bot/info'),
  getGuildsWithInvites: () => apiClient.get('/bot/guilds/invites'),
  updateBotAvatar: (avatarUrl) => apiClient.post('/bot/avatar', { avatarUrl }),
  updateBotBanner: (bannerUrl) => apiClient.post('/bot/banner', { bannerUrl }),
  uploadBotAvatar: (formData) => apiClient.post('/bot/avatar/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadBotBanner: (formData) => apiClient.post('/bot/banner/formData', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  leaveGuild: (guildId) => apiClient.post(`/guilds/${guildId}/leave`),

  // Direct Messages
  getBotDMs: () => apiClient.get('/bot/dms'),
  replyToDM: (userId, content, messageIds = null) => 
    apiClient.post(`/bot/dms/${userId}/reply`, { content, messageIds }),
  getUserById: (userId) => apiClient.get(`/users/${userId}`),

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
  kickUser: (guildId, userId, reason) =>
    apiClient.post(`/guilds/${guildId}/members/${userId}/kick`, { reason }),
  timeoutUser: (guildId, userId, durationMinutes, reason) =>
    apiClient.post(`/guilds/${guildId}/members/${userId}/timeout`, { durationMinutes, reason }),
  untimeoutUser: (guildId, userId) =>
    apiClient.post(`/guilds/${guildId}/members/${userId}/untimeout`),
  getGuildMembers: (guildId, { limit = 100, offset = 0, search = '', refresh = false } = {}) =>
    apiClient.get(`/guilds/${guildId}/members`, { params: { limit, offset, search, refresh: refresh ? 1 : 0 } }),
  getGuildMember: (guildId, userId) =>
    apiClient.get(`/guilds/${guildId}/members/${userId}`),
  updateUserMoney: (userId, amount) => 
    apiClient.post(`/users/${userId}/money/update`, { amount }),

  // Settings
  getSettings: (guildId) => apiClient.get(`/guilds/${guildId}/settings`),
  updateSettings: (guildId, data) => apiClient.put(`/guilds/${guildId}/settings`, data),
  getAuthority: (guildId) => apiClient.get(`/guilds/${guildId}/authority`),
  updateAuthority: (guildId, data) => apiClient.put(`/guilds/${guildId}/authority`, data),
  getModlog: (guildId) => apiClient.get(`/guilds/${guildId}/modlog`),
  updateModlog: (guildId, data) => apiClient.put(`/guilds/${guildId}/modlog`, data),

  // Command Settings
  getCommandsList: () => apiClient.get('/commands/list'),
  getGuildCommands: (guildId) => apiClient.get(`/guilds/${guildId}/commands`),
  getCommandSettings: (guildId, commandName) => apiClient.get(`/guilds/${guildId}/commands/${commandName}`),
  updateCommandSettings: (guildId, commandName, data) => apiClient.put(`/guilds/${guildId}/commands/${commandName}`, data),
  deleteCommandSettings: (guildId, commandName) => apiClient.delete(`/guilds/${guildId}/commands/${commandName}`),

  // Actions (Role Menus)
  getActionGroups: (guildId) => 
    apiClient.get(`/guilds/${guildId}/actions`),
  getActionGroup: (guildId, groupId) => 
    apiClient.get(`/guilds/${guildId}/actions/${groupId}`),
  createActionGroup: (guildId, groupName) => 
    apiClient.post(`/guilds/${guildId}/actions`, { groupName }),
  updateActionGroup: (guildId, groupId, data) => 
    apiClient.put(`/guilds/${guildId}/actions/${groupId}`, data),
  deleteActionGroup: (guildId, groupId) => 
    apiClient.delete(`/guilds/${guildId}/actions/${groupId}`),
  addActionEntry: (guildId, groupId, entryData) => 
    apiClient.post(`/guilds/${guildId}/actions/${groupId}/entries`, entryData),
  updateActionEntry: (guildId, groupId, entryId, entryData) => 
    apiClient.put(`/guilds/${guildId}/actions/${groupId}/entries/${entryId}`, entryData),
  deleteActionEntry: (guildId, groupId, entryId) => 
    apiClient.delete(`/guilds/${guildId}/actions/${groupId}/entries/${entryId}`),
  setupActionGroup: (guildId, groupId, setupData) => 
    apiClient.post(`/guilds/${guildId}/actions/${groupId}/setup`, setupData),

  // Guard (ayrı token'lı guard botu - ortak DB)
  getGuardHealth: () => apiClient.get('/guard/health'),
  getGuardGuilds: () => apiClient.get('/guard/guilds'),
  getGuardChannels: (guildId) => apiClient.get(`/guard/guilds/${guildId}/channels`),
  getGuardRoles: (guildId) => apiClient.get(`/guard/guilds/${guildId}/roles`),
  getGuardMembers: (guildId, { search = '', limit = 10 } = {}) =>
    apiClient.get(`/guard/guilds/${guildId}/members`, { params: { search, limit } }),
  sendGuardMessage: (data) => apiClient.post('/guard/message/send', data),
  getGuardSettings: (guildId) => apiClient.get(`/guard/guilds/${guildId}/settings`),
  updateGuardSettings: (guildId, data) => apiClient.put(`/guard/guilds/${guildId}/settings`, data),
  getGuardLogs: (guildId, params = {}) => 
    apiClient.get(`/guard/guilds/${guildId}/logs`, { params }),
  getGuardLogStats: (guildId, days = 7) => 
    apiClient.get(`/guard/guilds/${guildId}/logs/stats`, { params: { days } }),
  getGuardModerators: (guildId, days = 30) => 
    apiClient.get(`/guard/guilds/${guildId}/moderators`, { params: { days } }),
  getGuardModeratorDetail: (guildId, userId, days = 30) => 
    apiClient.get(`/guard/guilds/${guildId}/moderators/${userId}`, { params: { days } }),
  getGuardActionLimits: (guildId) => apiClient.get(`/guard/guilds/${guildId}/action-limits`),
  getGuardBackups: (guildId) => apiClient.get(`/guard/guilds/${guildId}/backups`),
  deleteGuardBackup: (guildId, backupId) => 
    apiClient.delete(`/guard/guilds/${guildId}/backups/${backupId}`),
  getGuardCommandPermissions: (guildId) =>
    apiClient.get(`/guard/guilds/${guildId}/command-permissions`),
  getGuardCommandPermission: (guildId, commandName) =>
    apiClient.get(`/guard/guilds/${guildId}/command-permissions/${commandName}`),
  updateGuardCommandPermission: (guildId, commandName, data) =>
    apiClient.put(`/guard/guilds/${guildId}/command-permissions/${commandName}`, data),
  resetGuardCommandPermission: (guildId, commandName) =>
    apiClient.delete(`/guard/guilds/${guildId}/command-permissions/${commandName}`),
};

export default apiClient;
