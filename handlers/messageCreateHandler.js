import Afk from '../models/Afk.js';

export default async function messageCreateHandler(message) {
  if (!message.guild || message.author.bot) return;

  const mentioned = message.mentions.users.first();
  if (mentioned) {
    const afkData = await Afk.findOne({ userId: mentioned.id });
    if (afkData) {
      message.channel.send({
        content: `**${mentioned.username}** şu anda AFK: ${afkData.reason}`
      });
    }
  }

  // Kullanıcı kendi AFK'sını bozuyor mu?
  const selfAfk = await Afk.findOne({ userId: message.author.id });
  if (selfAfk) {
    await Afk.deleteOne({ userId: message.author.id });
    message.reply('Hoş geldin, artık AFK değilsin.');
  }
}
