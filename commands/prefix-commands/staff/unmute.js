import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';
import { muteTimeouts } from './mute.js';

export default {
  name: 'unmute',
  description: 'Kullanıcının susturmasını kaldırır.',
  usage: '.unmute @kullanıcı',
  category: 'moderation',
  permissions: {
    authorities: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Administrator],
  },
    
  
  async execute(client, message, args) {
	  
	  const sender = new Manager(client, { action: message }).sender;
	
    const member = message.mentions.members.first();
    if (!member) return sender.reply(sender.errorEmbed("❌ Susturmayı kaldırmak için bir kullanıcı etiketlemelisin."));

    const mutedRole = message.guild.roles.cache.find(r => r.name === 'Muted');
    if (!mutedRole || !member.roles.cache.has(mutedRole.id)) return sender.reply(sender.errorEmbed("❌ Bu kullanıcı susturulmamış."));
  
    const timeoutKey = `${message.guild.id}-${member.id}`;
    if (muteTimeouts.has(timeoutKey)) {
      clearTimeout(muteTimeouts.get(timeoutKey));
      muteTimeouts.delete(timeoutKey);
    }
  
    await member.roles.remove(mutedRole);
    return sender.reply(sender.classic(`<@${member.id}> adlı kullanıcının susturması kaldırıldı.`));
  }
};
