import { getVoiceConnection } from '@discordjs/voice'
import { messageSender } from "#helpers"

export default {
  name: 'sescik',
  description: 'Bot ses kanalından çıkar',
  usage: 'ses gir <#channel / channelId>',
  async execute(client, message) {
	const sender = new messageSender(message)
	
    const connection = getVoiceConnection(message.guild.id);
	
    if (!connection) return sender.reply(sender.errorEmbed('Zaten hiçbir ses kanalında değilim.'));

    connection.destroy();
	
	const IEmbed = sender.classic('📤 Ses kanalından ayrıldım.')
    message.channel.send({embeds: [IEmbed]});
  }
};
