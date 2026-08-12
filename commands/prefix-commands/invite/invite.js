import Manager from '#managers';
import { InviteModel } from '#models';

export default {
  name: 'invites',
  aliases: ["davet"],
  description: 'Kullanıcının davet sayısını gösterir.',
  usage: "invites @kullanıcı",
  category: 'invite',

  permissions: {
    enabled: false
  },

  async execute(client, message, args) {
	  const manager = new Manager(client, { action: message });

    try {
      const user = message.mentions.users.first() || message.author;
      const record = await InviteModel.findOne({ guildId: message.guild.id, userId: user.id });
      const count = record ? record.invitesCount : 0;

      manager.sender.reply(manager.sender.classic(
		`**${user.globalName}**, toplam \`${count}\` kişiyi davet ettin.`
	  ));
    } catch (err) {
      console.error(err);
      manager.sender.reply(manager.sender.errorEmbed('Bir hata oluştu.'));
    }
  },
};
