import { messageSender } from '#helpers';

export default {
  name: 'cihaz',
  aliases: ['device'],
  description: 'Kişinin cihazını gösterir.',
  usage: 'cihaz @user',
  category: 'moderation',
  async execute(client, message, args) {
	const sender = new messageSender(message);

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.author || message.author;
    if (!member) return sender.reply(sender.errorEmbed('Kullanıcı bulunamadı.'));

    const status = member.presence?.clientStatus;
    if (!status) return sender.reply(sender.errorEmbed('Cihaz bilgisi alınamıyor veya kullanıcı çevrimdışı.'));

    const deviceMap = {
      desktop: '💻 Bilgisayar',
      mobile: '📱 Mobil',
      web: '🌐 Tarayıcı'
    };

    const devices = Object.keys(status).map(key => deviceMap[key] || key).join(', ');
	const IEmbed = sender.classic(`**${member.user.globalName}**, şu cihazlarda aktif: **${devices}**`)
	
    return message.channel.send({embeds: [IEmbed]});
  }
};
