import { EmbedBuilder, Colors } from 'discord.js';

/**
 * Guard için embed oluşturucu
 */
export function createGuardEmbed(type, data = {}) {
  const embed = new EmbedBuilder();

  switch (type) {
    case 'success':
      embed
        .setColor(Colors.Green)
        .setTitle('Başarılı')
        .setDescription(data.description || 'İşlem başarıyla tamamlandı.');
      break;

    case 'error':
      embed
        .setColor(Colors.Red)
        .setTitle('❌ Hata')
        .setDescription(data.description || 'Bir hata oluştu.');
      break;

    case 'warning':
      embed
        .setColor(Colors.Yellow)
        .setTitle('⚠️ Uyarı')
        .setDescription(data.description || 'Dikkat edilmesi gereken bir durum.');
      break;

    case 'info':
      embed
        .setColor(Colors.Blue)
        .setTitle('ℹ️ Bilgi')
        .setDescription(data.description || 'Bilgilendirme mesajı.');
      break;

    case 'guard_action':
      embed
        .setColor(Colors.Orange)
        .setTitle('🛡️ Guard İşlemi')
        .setDescription(data.description || 'Guard tarafından bir işlem gerçekleştirildi.');
      break;

    default:
      embed
        .setColor(Colors.Blurple)
        .setTitle('📋 Mesaj')
        .setDescription(data.description || 'Mesaj');
  }

  if (data.fields) {
    embed.addFields(data.fields);
  }

  if (data.footer) {
    embed.setFooter(data.footer);
  }

  if (data.timestamp) {
    embed.setTimestamp();
  }

  return embed;
}

/**
 * Ceza türlerini insan okunabilir formata çevir
 */
export function formatPunishmentType(type) {
  const punishmentNames = {
    ban: '🔨 Ban',
    kick: '👢 Kick',
    removePerms: '🔒 Yetki Çekme',
    jail: '⛓️ Jail',
    closePerms: '🚫 Tüm Yetkileri Kapatma',
    timeout: '⏱️ Timeout',
    none: '✨ Cezasız'
  };

  return punishmentNames[type] || type;
}

/**
 * Ceza listesini formatla
 */
export function formatPunishmentList(punishments) {
  if (!punishments || punishments.length === 0) {
    return 'Ceza yok';
  }

  return punishments.map(p => formatPunishmentType(p)).join(', ');
}

/**
 * Guard türlerini insan okunabilir formata çevir
 */
export function formatGuardType(type) {
  const guardNames = {
    roleCreate: '🛡️ Rol Oluşturma',
    roleDelete: '🛡️ Rol Silme',
    roleUpdate: '🛡️ Rol Güncelleme',
    channelCreate: '🛡️ Kanal Oluşturma',
    channelDelete: '🛡️ Kanal Silme',
    channelUpdate: '🛡️ Kanal Güncelleme',
    ban: '🛡️ Ban',
    kick: '🛡️ Kick',
    roleAssign: '🛡️ Rol Verme',
    botAdd: '🛡️ Bot Ekleme',
    guildUpdate: '🛡️ Sunucu Güncelleme',
    vanityUpdate: '🛡️ Vanity URL',
    spam: '🛡️ Spam',
    advertisement: '🛡️ Reklam',
    protectedRoleAssign: '🛡️ Korumalı Rol'
  };

  return guardNames[type] || type;
}

/**
 * Süreyi okunabilir formata çevir (milisaniye -> insan okunabilir)
 */
export function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} gün ${hours % 24} saat`;
  } else if (hours > 0) {
    return `${hours} saat ${minutes % 60} dakika`;
  } else if (minutes > 0) {
    return `${minutes} dakika ${seconds % 60} saniye`;
  } else {
    return `${seconds} saniye`;
  }
}

/**
 * Süreyi kısa formatta göster
 */
export function formatDurationShort(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}g`;
  if (hours > 0) return `${hours}s`;
  if (minutes > 0) return `${minutes}dk`;
  return `${seconds}sn`;
}

/**
 * Limit durumunu kontrol et ve formatla
 */
export function formatLimitStatus(current, max) {
  const percentage = (current / max) * 100;
  
  let emoji = '🟢';
  if (percentage >= 80) emoji = '🔴';
  else if (percentage >= 50) emoji = '🟡';

  return `${emoji} ${current}/${max}`;
}

/**
 * Guard ayarlarını özet olarak formatla
 */
export function formatGuardSummary(settings) {
  const guards = settings.guards;
  const activeGuards = [];
  
  if (guards.roleGuard?.create || guards.roleGuard?.delete || guards.roleGuard?.update) {
    activeGuards.push('Rol Guard');
  }
  if (guards.channelGuard?.create || guards.channelGuard?.delete || guards.channelGuard?.update) {
    activeGuards.push('Kanal Guard');
  }
  if (guards.banGuard) activeGuards.push('Ban Guard');
  if (guards.kickGuard) activeGuards.push('Kick Guard');
  if (guards.botGuard) activeGuards.push('Bot Guard');
  if (guards.vanityGuard) activeGuards.push('Vanity Guard');
  if (guards.spamGuard) activeGuards.push('Spam Guard');
  if (guards.advertisementGuard) activeGuards.push('Reklam Guard');

  return activeGuards.length > 0 
    ? activeGuards.join(', ') 
    : 'Hiçbir guard aktif değil';
}

/**
 * Güvenli kullanıcı/rol sayısını formatla
 */
export function formatSafetyInfo(settings, guild) {
  const safeUsers = settings.safeguard.safeUsers.length;
  const safeRoles = settings.safeguard.safeRoles.length;
  const allowedBots = settings.safeguard.allowedBots.length;
  const protectedRoles = settings.protectedRoles.length;

  return [
    `👥 Güvenli Kullanıcı: **${safeUsers}**`,
    `🎭 Güvenli Rol: **${safeRoles}**`,
    `🤖 İzinli Bot: **${allowedBots}**`,
    `🛡️ Korumalı Rol: **${protectedRoles}**`
  ].join('\n');
}

/**
 * Backup bilgilerini formatla
 */
export function formatBackupInfo(backup) {
  return {
    id: backup._id.toString(),
    date: `<t:${Math.floor(backup.backupDate.getTime() / 1000)}:F>`,
    dateRelative: `<t:${Math.floor(backup.backupDate.getTime() / 1000)}:R>`,
    roles: backup.roles.length,
    channels: backup.channels.length,
    emojis: backup.emojis.length,
    bans: backup.bans.length,
    summary: `${backup.roles.length} rol, ${backup.channels.length} kanal, ${backup.emojis.length} emoji`
  };
}

/**
 * Log olaylarını kullanıcı dostu formata çevir
 */
export function formatLogEvent(log) {
  const eventName = formatGuardType(log.eventType);
  const executor = log.executor ? `<@${log.executor.id}>` : 'Bilinmiyor';
  const target = log.target ? log.target.name : 'Hedef yok';
  const status = log.status === 'prevented' ? '✅ Engellendi' :
                 log.status === 'punished' ? '⚔️ Cezalandırıldı' :
                 log.status === 'restored' ? '♻️ Geri Yüklendi' :
                 log.status === 'logged' ? '📝 Kaydedildi' : log.status;

  return {
    title: eventName,
    executor,
    target,
    status,
    punishments: formatPunishmentList(log.punishments),
    timestamp: `<t:${Math.floor(log.timestamp.getTime() / 1000)}:R>`
  };
}

/**
 * İzin/Yetki kontrolü mesajı oluştur
 */
export function createPermissionDeniedMessage(reason = 'Bu işlem için yetkiniz yok.') {
  return createGuardEmbed('error', {
    description: `🚫 **Erişim Engellendi**\n\n${reason}`,
    timestamp: true
  });
}

/**
 * Başarı mesajı oluştur
 */
export function createSuccessMessage(title, description, fields = []) {
  return createGuardEmbed('success', {
    description: `**${title}**\n\n${description}`,
    fields,
    timestamp: true
  });
}

/**
 * Onay mesajı oluştur (tehlikeli işlemler için)
 */
export function createConfirmationMessage(action, details, warnings = []) {
  const warningText = warnings.length > 0 
    ? '\n\n⚠️ **Uyarılar:**\n' + warnings.map(w => `• ${w}`).join('\n')
    : '';

  return createGuardEmbed('warning', {
    description: `**${action}**\n\n${details}${warningText}\n\nDevam etmek istiyor musunuz?`,
    timestamp: true
  });
}

/**
 * Progress bar oluştur (limit gösterimi için)
 */
export function createProgressBar(current, max, length = 10) {
  const percentage = Math.min((current / max) * 100, 100);
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percentText = `${percentage.toFixed(0)}%`;

  return `${bar} ${percentText} (${current}/${max})`;
}

/**
 * Kullanıcı mention'ını temizle
 */
export function sanitizeMention(text) {
  return text.replace(/<@!?(\d+)>/g, '@user').replace(/<@&(\d+)>/g, '@role');
}

/**
 * Guard istatistikleri oluştur
 */
export function createGuardStats(logs) {
  const stats = {
    total: logs.length,
    prevented: 0,
    punished: 0,
    restored: 0,
    logged: 0,
    byType: {}
  };

  logs.forEach(log => {
    stats[log.status] = (stats[log.status] || 0) + 1;
    stats.byType[log.eventType] = (stats.byType[log.eventType] || 0) + 1;
  });

  return stats;
}

/**
 * Sayı formatlayıcı (1000 -> 1K)
 */
export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Tarih aralığı kontrolü
 */
export function isWithinTimeRange(date, rangeMs) {
  return Date.now() - date.getTime() < rangeMs;
}

/**
 * Aksiyon limiti kalan süre
 */
export function getTimeUntilReset(lastReset, windowMs = 60000) {
  const elapsed = Date.now() - lastReset.getTime();
  const remaining = windowMs - elapsed;
  return Math.max(0, remaining);
}

export default {
  createGuardEmbed,
  formatPunishmentType,
  formatPunishmentList,
  formatGuardType,
  formatDuration,
  formatDurationShort,
  formatLimitStatus,
  formatGuardSummary,
  formatSafetyInfo,
  formatBackupInfo,
  formatLogEvent,
  createPermissionDeniedMessage,
  createSuccessMessage,
  createConfirmationMessage,
  createProgressBar,
  sanitizeMention,
  createGuardStats,
  formatNumber,
  isWithinTimeRange,
  getTimeUntilReset
};
