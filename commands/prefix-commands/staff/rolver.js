import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  name: 'rolver',
  description: 'Kullanıcıya rol verir.',
  usage: '.rolver @kullanıcı @rol | .rolver kullanıcıID rolID',
  category: 'moderation',
  
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);
      const sender = new messageSender(message);

      let member = message.mentions.members.first();
      if (!member && args[0]) {
        const fetchedMember = await message.guild.members.fetch(args[0]).catch(() => null);
        if (fetchedMember) member = fetchedMember;
      }

      let role = message.mentions.roles.first();
      if (!role && args[1]) {
        const fetchedRole = message.guild.roles.cache.get(args[1]);
        if (fetchedRole) role = fetchedRole;
      }

      if (!member) return sender.reply(sender.errorEmbed('❌ Kullanıcıyı etiketlemeli veya geçerli bir ID girmelisin!'));
      if (!role) return sender.reply(sender.errorEmbed('❌ Rolü etiketlemeli veya geçerli bir ID girmelisin!'));

      const isRole = message.guild.roles.cache.get(role.id);
      if (!isRole) return sender.reply(sender.errorEmbed('❌ Böyle bir rol yok!'));

      const isUserHasRole = member.roles.cache.has(role.id);
      if (isUserHasRole) return sender.reply(sender.errorEmbed('❌ Kullanıcı zaten bu role sahip!'));

      // Yetki Kontrolleri
      const ctrl = await PM.control(PM.flags.ManageRoles, PM.flags.Administrator);
      if (!ctrl) return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için yetkin yok.'));

      await member.roles.add(role);
      return sender.reply(sender.classic(`<@${member.id}> adlı kullanıcıya ${role} rolü başarıyla verildi.`));
    } catch (error) {
      console.error('Hata:', error.message);
      return sender.reply(sender.errorEmbed('❌ Bir hata oluştu.'));
    }
  }
};
