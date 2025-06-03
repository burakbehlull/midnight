import { messageSender } from '#helpers';

export default {
  name: 'owner',
  description: 'Sunucu sahibini gösterir.',
  aliases: ['tac'],
  usage: 'owner',
  async execute(client, message) {
    if (!message.guild) return;
	const sender = new messageSender(message)

    try {
      const owner = await message.guild.fetchOwner();
	  const IEmbed = sender.classic(`👑 Sunucunun sahibi <@${owner.user.id}>`)
      return message.channel.send({embeds: [IEmbed]});
    } catch (error) {
      console.error('Owner komutu hatası', error);
      return sender.reply(sender.errorEmbed('❌ Sunucu sahibi alınamadı.'));
    }
  }
};
