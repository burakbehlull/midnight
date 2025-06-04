import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  name: 'unmute',
  description: 'Kullanıcının susturmasını kaldırır.',
  usage: '.unmute @kullanıcı',
  
  async execute(client, message, args) {
	  
	const sender = new messageSender(message)
	
	const PM = new PermissionsManager(message);
    const ctrl = await PM.control(PM.flags.ManageMessages, PM.flags.Administrator)
	if (!ctrl) return sender.reply(sender.errorEmbed("❌ Bu komutu kullanmak için yetkin yok."));
	  
    const member = message.mentions.members.first();
    if (!member) return sender.reply(sender.errorEmbed("❌ Susturmayı kaldırmak için bir kullanıcı etiketlemelisin."));

    const mutedRole = message.guild.roles.cache.find(r => r.name === 'Muted');
    if (!mutedRole || !member.roles.cache.has(mutedRole.id)) return sender.reply(sender.errorEmbed("❌ Bu kullanıcı susturulmamış."));
  
  
    await member.roles.remove(mutedRole);
    return sender.reply(sender.classic(`<@${member.id}> adlı kullanıcının susturması kaldırıldı.`));
  }
};
