import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  name: 'rolver',
  description: 'Kullanıcıya rol verir.',
  usage: '.rolver @kullanıcı @rol',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);
	  const sender = new messageSender(message);

      const member = message.mentions.members.first();
      const role = message.mentions.roles.first();

      if (!member) return sender.reply(sender.errorEmbed('❌ Kullanıcıyı etiketlemelisin!'));
      if (!role) return sender.reply(sender.errorEmbed('❌ Rolü etiketlemelisin!'));

      const isRole = message.guild.roles.cache.get(role.id);
      if (!isRole) return sender.reply(sender.errorEmbed('❌ Böyle bir rol yok!'));

      const isUserHasRole = member.roles.cache.has(role.id);
      if (isUserHasRole) return sender.reply(sender.errorEmbed('❌ Kullanıcı zaten bu role sahip!'));

      // Yetki Kontrolleri
       const ctrl = await PM.control(PM.flags.ManageRoles, PM.flags.Administrator)
	  if (!ctrl) return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için yetkin yok.'));
	  
      await member.roles.add(role);
      return sender.reply(sender.classic(`<@${member.id}> adlı kullanıcıya ${role} rolü başarıyla verildi.`));
    } catch (error) {
      console.error('Hata:', error.message);
      return sender.reply(sender.errorEmbed('❌ Bir hata oluştu.'));
    }
  }
};
