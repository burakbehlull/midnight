import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'rolver',
  description: 'Kullanıcıya rol verir.',
  usage: '.rolver @kullanıcı @rol | .rolver kullanıcıID rolID',
  category: 'moderation',

  permissions: {
      authorities: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Administrator],
  },
  
  async execute(client, message, args) {
    const manager = new Manager(client, {
      action: message
    });

    try {
      

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

      if (!member) return manager.sender.reply(manager.sender.errorEmbed('❌ Kullanıcıyı etiketlemeli veya geçerli bir ID girmelisin!'));
      if (!role) return manager.sender.reply(manager.sender.errorEmbed('❌ Rolü etiketlemeli veya geçerli bir ID girmelisin!'));

      const isRole = message.guild.roles.cache.get(role.id);
      if (!isRole) return manager.sender.reply(manager.sender.errorEmbed('❌ Böyle bir rol yok!'));

      const isUserHasRole = member.roles.cache.has(role.id);
      if (isUserHasRole) return manager.sender.reply(manager.sender.errorEmbed('❌ Kullanıcı zaten bu role sahip!'));

      await member.roles.add(role);
      return manager.sender.reply(manager.sender.classic(`<@${member.id}> adlı kullanıcıya ${role} rolü başarıyla verildi.`));
    } catch (error) {
      console.error('Hata:', error.message);
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bir hata oluştu.'));
    }
  }
};
