import { PermissionFlagsBits } from 'discord.js';

export async function safeAuditLog(guild, options) {
  try {
    if (!guild) return null;

    const botMember = guild.members.cache.get(guild.client.user.id);
    if (!botMember) return null;

    if (!botMember.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      return null;
    }

    const logs = await guild.fetchAuditLogs(options).catch(err => {
      console.error(`[safeAuditLog] Audit log alınamadı (${guild.name}):`, err.message);
      return null;
    });

    return logs;
  } catch (error) {
    console.error('[safeAuditLog] Beklenmeyen hata:', error.message);
    return null;
  }
}

export function wrapEventHandler(handler) {
  return async function(...args) {
    try {
      await handler(...args);
    } catch (error) {
      if (error.code === 50013) {
        return;
      }
      if (error.code === 10004) {
        return;
      }
      console.error(`[Event Handler] Hata:`, error.message);
    }
  };
}
