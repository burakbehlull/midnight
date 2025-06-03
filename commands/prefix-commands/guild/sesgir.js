import { joinVoiceChannel, getVoiceConnection } from '@discordjs/voice'
import { messageSender } from "#helpers"

export default {
  name: 'sesgir',
  description: 'Bot belirtilen ses kanalına katılır',
  async execute(client, message, args) {
    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
	const sender = new messageSender(message)
	
    if (!channel || channel.type !== 2) return sender.reply(sender.errorEmbed('Geçerli bir ses kanalı belirtmelisin.'));
    
    if (!channel.joinable) return sender.reply(sender.errorEmbed('Bu kanala katılamıyorum. Yetkilerimi kontrol et.'));

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false
      });
	  const IEmbed = sender.classic(`🔊 **${channel.name}** kanalına başarıyla katıldım.`)
      message.channel.send({embeds: [IEmbed]});
    } catch (err) {
      console.error('Ses kanalına girerken hata:', err);
      sender.reply(sender.errorEmbed('Ses kanalına girerken bir hata oluştu.'));
    }
  }
};
