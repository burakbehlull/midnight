import Manager from '#managers';

export default {
  name: 'cihaz',
  aliases: ['device'],
  description: 'Kişinin cihazını gösterir.',
  usage: 'cihaz @user',
  category: 'moderation',

  permissions: {
    enabled: false
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.author || message.author;
    if (!member) return manager.sender.reply(manager.sender.errorEmbed('Kullanıcı bulunamadı.'));

    const status = member.presence?.clientStatus;
    if (!status) return manager.sender.reply(manager.sender.errorEmbed('Cihaz bilgisi alınamıyor veya kullanıcı çevrimdışı.'));

    const deviceMap = {
      desktop: '💻 Bilgisayar',
      mobile: '📱 Mobil',
      web: '🌐 Tarayıcı'
    };

    const devices = Object.keys(status).map(key => deviceMap[key] || key).join(', ');
    const IEmbed = manager.sender.classic(`**${member.user.globalName}**, şu cihazlarda aktif: **${devices}**`)
    
    return message.channel.send({embeds: [IEmbed]});
  }
};
