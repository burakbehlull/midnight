import { joinVoiceChannel, getVoiceConnection } from '@discordjs/voice'
import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';


export default {
  name: 'sesgir',
  description: 'Bot belirtilen ses kanalına katılır',
  usage: 'sesgir <#channel / channelId>',
  category: 'server',
  permissions: {
    authorities: [PermissionFlagsBits.Administrator]
  },
  
  
  async execute(client, message, args) {
    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
    
	  const manager = new Manager(client, { action: message });

	
    if (!channel || channel.type !== 2) return manager.sender.reply(manager.sender.errorEmbed('Geçerli bir ses kanalı belirtmelisin.'));
    
    if (!channel.joinable) return manager.sender.reply(manager.sender.errorEmbed('Bu kanala katılamıyorum. Yetkilerimi kontrol et.'));

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
      });
	  const IEmbed = manager.sender.classic(`🔊 **${channel.name}** kanalına başarıyla katıldım.`)
      message.channel.send({embeds: [IEmbed]});
    } catch (err) {
      console.error('Ses kanalına girerken hata:', err);
      manager.sender.reply(manager.sender.errorEmbed('Ses kanalına girerken bir hata oluştu.'));
    }
  }
};
