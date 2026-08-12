import Manager from '#managers';

export default {
  name: 'owner',
  description: 'Sunucu sahibini gösterir.',
  aliases: ['tac', 'taç'],
  usage: 'owner',
  category: 'user',

  permissions: {
    enabled: false
  },
  async execute(client, message) {
    if (!message.guild) return;
	  const manager = new Manager(client, { action: message });

    try {
      const owner = await message.guild.fetchOwner();
	  const IEmbed = manager.sender.classic(`👑 Sunucunun sahibi <@${owner.user.id}>`)
      return message.channel.send({embeds: [IEmbed]});
    } catch (error) {
      console.error('Owner komutu hatası', error);
      return manager.sender.reply(manager.sender.errorEmbed('❌ Sunucu sahibi alınamadı.'));
    }
  }
};
