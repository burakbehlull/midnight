import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  name: 'mute',
  description: 'Kullanıcıyı susturur.',
  usage: '.mute @kullanıcı',
  async execute(client, message, args) {
	  
	const PM = new PermissionsManager(message);
	const sender = new messageSender(message);
	  
    const ctrl = await PM.control(PM.flags.ManageMessages, PM.flags.Administrator)
	if (!ctrl) return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için yetkin yok.'));
	
    const member = message.mentions.members.first();
    if (!member) return sender.reply(sender.errorEmbed('❌ Susturmak için bir kullanıcı etiketlemelisin.'));

    let mutedRole = message.guild.roles.cache.find(r => r.name === 'Muted');
    
    if (!mutedRole) {
      try {
        mutedRole = await message.guild.roles.create({
          name: 'Muted',
          color: '#555555',
          permissions: []
        });

        message.guild.channels.cache.forEach(async (channel) => {
          await channel.permissionOverwrites.create(mutedRole, {
            SendMessages: false,
            AddReactions: false,
            Speak: false
          });
        });
      } catch (err) {
        console.error(err);
        return sender.reply(sender.errorEmbed('❌ Muted rolü oluşturulamadı.'));
      }
    }

    if (member.roles.cache.has(mutedRole.id)) return sender.reply(sender.errorEmbed('❌ Bu kullanıcı zaten susturulmuş.'));
    

    await member.roles.add(mutedRole);
    return sender.reply(sender.classic(`<@${member.id}> susturuldu.`));
  }
};
