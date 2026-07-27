import { joinVoiceChannel, getVoiceConnection } from '@discordjs/voice'
import { messageSender } from "#helpers"
import { PermissionsManager } from '#managers';


export default {
  name: 'sesgir',
  description: 'Bot belirtilen ses kanalına katılır',
  usage: 'sesgir <#channel / channelId>',
  category: 'server',
  
  async execute(client, message, args) {
    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
	const sender = new messageSender(message)
	
	const PM = new PermissionsManager(message);
    const ctrl = await PM.control(PM.flags.Administrator)
	if (!ctrl) return sender.reply(sender.errorEmbed("❌ Bu komutu kullanmak için yetkin yok."));
	  
	
    if (!channel || channel.type !== 2) return sender.reply(sender.errorEmbed('Geçerli bir ses kanalı belirtmelisin.'));
    
    if (!channel.joinable) return sender.reply(sender.errorEmbed('Bu kanala katılamıyorum. Yetkilerimi kontrol et.'));

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
      });
	  const IEmbed = sender.classic(`🔊 **${channel.name}** kanalına başarıyla katıldım.`)
      message.channel.send({embeds: [IEmbed]});
    } catch (err) {
      console.error('Ses kanalına girerken hata:', err);
      sender.reply(sender.errorEmbed('Ses kanalına girerken bir hata oluştu.'));
    }
  }
};
