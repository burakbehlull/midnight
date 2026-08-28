import { Afk } from '#models';

export default async function afkHandler(message) {
  if (!message.guild || message.author.bot) return;
  const guildId = message.guild.id;

  const mentioned = message.mentions.users.first();
  if (mentioned) {
    const afkData = await Afk.findOne({ userId: mentioned.id, guildId });
    if (afkData) {
      const displayName = mentioned.globalName ?? mentioned.username;
      const reasonText = afkData.reason ? `: ${afkData.reason}` : '';
      message.channel.send({
        content: `**[AFK] ${displayName}** şu anda AFK${reasonText}`
      });
    }
  }

  const selfAfk = await Afk.findOne({ userId: message.author.id, guildId });
  if (selfAfk) {
    await Afk.deleteOne({ userId: message.author.id, guildId });

    const member = message.member;
    if (member && member.manageable) {
      try {
        await member.setNickname(selfAfk.originalNickname, 'AFK modundan çıkıldı');
      } catch (err) {
        console.error('[AFK] Nickname geri alınamadı:', err);
      }
    }

    const displayName = message.author.globalName ?? message.author.username;
    message.reply(`Hoş geldin **${displayName}**, artık AFK değilsin.`);
  }
}
