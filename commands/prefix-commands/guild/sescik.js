import { getVoiceConnection } from '@discordjs/voice'
import Manager from '#managers';

export default {
  name: 'sescik',
  description: 'Bot ses kanalından çıkar',
  usage: 'ses gir <#channel / channelId>',
  category: 'server',
  
  async execute(client, message) {
    
    const manager = new Manager(client, { action: message });

	
    const connection = getVoiceConnection(message.guild.id);
	
    if (!connection) return manager.sender.reply(manager.sender.errorEmbed('Zaten hiçbir ses kanalında değilim.'));

    connection.destroy();
	
	  const IEmbed = manager.sender.classic('📤 Ses kanalından ayrıldım.')
    message.channel.send({embeds: [IEmbed]});
  }
};
