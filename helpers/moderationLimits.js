
const WINDOW_MS = 10 * 60 * 1000; 

const PUNISHMENT_LABELS = {
  ban: 'Ban',
  kick: 'Kick',
  removePerms: 'Yetki Çekme',
  jail: 'Jail',
  closePerms: 'Tüm Yetkileri Kapatma',
  none: 'Cezasız'
};


export function formatPunishments(actions = []) {
  return actions.map((a) => PUNISHMENT_LABELS[a] || a).join(', ');
}


export async function enforceActionLimit(client, guild, member, actionType) {
  const result = { blocked: false, current: 0, max: 0, applied: [] };

  const guard = client?.guardManager;
  if (!guard?.perms || !guild || !member) return result;

  try {
    const settings = await guard.perms.getGuildSettings(guild.id);

    if (!settings.safeguard?.enabled) return result;
    if (await guard.perms.isProtected(guild.id, member)) return result;

    const max = Number(settings.limits?.[actionType] ?? 0);
    const current = await guard.getModeratorActionCount(guild.id, member.id, actionType, WINDOW_MS);

    result.current = current;
    result.max = max;

   
    if (current < max) return result;

    result.blocked = true;
    result.applied = await guard.executePunishments(
      guild,
      member,
      await guard.getPunishments(guild.id, actionType, null),
      `Guard: ${actionType} limiti aşıldı (${current}/${max})`
    );

    const tag = member.user?.tag ?? member.user?.username ?? member.id;
    await guard.logGuardAction({
      guildId: guild.id,
      eventType: actionType,
      executor: { id: member.id, tag },
      target: { id: member.id, name: tag, type: 'user' },
      punishments: result.applied,
      details: {
        reason: `Moderasyon komutu kullanıldı ama ${actionType} limiti dolu (işlem engellendi)`,
        limitExceeded: true,
        currentCount: current,
        maxLimit: max
      },
      status: 'prevented'
    });
  } catch (error) {
    console.error('[moderationLimits] Limit kontrolü hatası:', error);
  }

  return result;
}

export default { enforceActionLimit, formatPunishments };
