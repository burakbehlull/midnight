import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'rolver',
  description: 'Kullanıcıya rol verir.',
  aliases: ['giverole'],
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

      const isOwnerOrBotOwner = await manager.authority.checkOwnerAndBotOwners();
      if (!isOwnerOrBotOwner) {
        const authorHighestRole = message.member.roles.highest;
        
        if (role.position >= authorHighestRole.position) {
          return manager.sender.reply(manager.sender.errorEmbed(
            `❌ Bu rolü veremezsin!\n\n` +
            `**Senin En Yüksek Rolün:** ${authorHighestRole} (Pozisyon: ${authorHighestRole.position})\n` +
            `**Vermek İstediğin Rol:** ${role} (Pozisyon: ${role.position})\n\n` +
            `*Not: Sadece kendi rolünden ALTTAKI rolleri verebilirsin.*`
          ));
        }
      }

      const botMember = message.guild.members.cache.get(client.user.id);
      const botHighestRole = botMember.roles.highest;
      
      if (role.position >= botHighestRole.position) {
        return manager.sender.reply(manager.sender.errorEmbed(
          `❌ Bu rolü veremem!\n\n` +
          `**Botun En Yüksek Rolü:** ${botHighestRole} (Pozisyon: ${botHighestRole.position})\n` +
          `**Verilecek Rol:** ${role} (Pozisyon: ${role.position})\n\n` +
          `*Not: Bot sadece kendi rolünden ALTTAKI rolleri verebilir.*`
        ));
      }

      await member.roles.add(role);
      return manager.sender.reply(manager.sender.classic(`<@${member.id}> adlı kullanıcıya ${role} rolü başarıyla verildi.`));
    } catch (error) {
      console.error('Hata:', error.message);
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bir hata oluştu.'));
    }
  }
};
