import { getVoiceConnection } from '@discordjs/voice'
import { messageSender } from "#helpers"
import { PermissionsManager } from '#managers';

export default {
  name: 'sescik',
  description: 'Bot ses kanalından çıkar',
  usage: 'ses gir <#channel / channelId>',
  async execute(client, message) {
	const sender = new messageSender(message)
	
	const PM = new PermissionsManager(message);
    const ctrl = await PM.control(PM.flags.Administrator)
	if (!ctrl) return sender.reply(sender.errorEmbed("❌ Bu komutu kullanmak için yetkin yok."));
	  
	
    const connection = getVoiceConnection(message.guild.id);
	
    if (!connection) return sender.reply(sender.errorEmbed('Zaten hiçbir ses kanalında değilim.'));

    connection.destroy();
	
	const IEmbed = sender.classic('📤 Ses kanalından ayrıldım.')
    message.channel.send({embeds: [IEmbed]});
  }
};
