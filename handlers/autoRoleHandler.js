import Settings from '../models/Settings.js';

export default async function autoRoleHandler(member) {
  try {
    const guildId = member.guild.id;
    const settings = await Settings.findOne({ guildId });

    if (!settings || !settings.autoRoleId) return;

    const role = member.guild.roles.cache.get(settings.autoRoleId);
    if (!role) return;

    await member.roles.add(role, 'Otorol sistemi');
  } catch (err) {
    console.error(`[OTOROL] ${member.id} kullanıcısına rol verilirken hata:`, err);
  }
}
