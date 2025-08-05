import { Economy } from '#models';
import { messageSender } from '#helpers';

export default {
  name: 'profile',
  description: 'Kullanıcının profilini gösterir.',
  usage: '.profile [@kullanıcı]',
  category: 'economy',

  async execute(client, message, args) {
    const sender = new messageSender(message);
    const target = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;

    const userData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

    const embed = sender.classic(`📄 ${target.username} adlı kullanıcının profili`);
    embed.addFields(
      { name: '💰 Para', value: `${userData.money}`, inline: true },
      { name: 'Level', value: `${userData.level}`, inline: true },
      { name: 'XP', value: `${userData.xp}`, inline: true },
      { name: '❤️ Hearts', value: `${userData.hearts || 0}`, inline: true },
      { name: '🍪 Cookies', value: `${userData.cookies || 0}`, inline: true },
      { name: '💍 Evlilik', value: userData.marriedTo ? `<@${userData.marriedTo}>` : 'Yok', inline: true }
    );

    sender.reply(embed);
  }
};
