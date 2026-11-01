import { Afk } from '#models';

export default async function afkHandler(message) {
  if (!message.guild || message.author.bot) return;
  const guildId = message.guild.id;

  const mentioned = message.mentions.users.first();
  if (mentioned) {
    const afkData = await Afk.findOne({ userId: mentioned.id, guildId });
    if (afkData) {
      if (mentioned.id !== message.author.id) {
        await Afk.updateOne(
          { userId: mentioned.id, guildId },
          { $addToSet: { taggedBy: message.author.id } }
        ).catch(() => {});
      }

      const memberObj = message.mentions.members?.first();
      const displayName =
        afkData.originalNickname ??
        memberObj?.user.globalName ??
        mentioned.globalName ??
        mentioned.username;

      const reasonPart = afkData.reason
        ? ` bu sebepten dolayı AFK: **${afkData.reason}**`
        : ' şu anda AFK.';

      message.channel.send({
        content: `**[AFK] ${displayName}**${reasonPart}`
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
    let reply = `Hoş geldin **${displayName}**, artık AFK değilsin.`;

    if (selfAfk.taggedBy && selfAfk.taggedBy.length > 0) {
      const list = selfAfk.taggedBy.map((id) => `<@${id}>`).join(', ');
      reply += `\nYokluğunda şunlar tarafından etiketlendin: ${list}`;
    }

    message.reply(reply);
  }
}
