import { PermissionsManager } from '#managers';

export default {
  name: 'rolver',
  description: 'Kullanıcıya rol verir.',
  usage: '.rolver @kullanıcı @rol',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);

      const member = message.mentions.members.first();
      const role = message.mentions.roles.first();

      if (!member) return message.reply('❌ Kullanıcıyı etiketlemelisin!');
      if (!role) return message.reply('❌ Rolü etiketlemelisin!');

      const isRole = message.guild.roles.cache.get(role.id);
      if (!isRole) return message.reply('❌ Böyle bir rol yok!');

      const isUserHasRole = member.roles.cache.has(role.id);
      if (isUserHasRole) return message.reply('❌ Kullanıcı zaten bu role sahip!');

      // Yetki Kontrolleri
       const ctrl = await PM.control(PM.flags.ManageRoles, PM.flags.Administrator)
	  if (!ctrl) return message.reply('❌ Bu komutu kullanmak için yetkin yok.');
	  
      await member.roles.add(role);
      return message.reply(`<@${member.id}> adlı kullanıcıya ${role} rolü başarıyla verildi.`);
    } catch (error) {
      console.error('Hata:', error.message);
      return message.reply('❌ Bir hata oluştu.');
    }
  }
};
