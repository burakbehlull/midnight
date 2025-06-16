import { InviteModel } from '#models';
import { messageSender } from "#helpers";

export default {
  name: 'invites',
  aliases: ["davet"],
  description: 'Kullanıcının davet sayısını gösterir.',
  usage: "invites @kullanıcı",
  category: 'invite',
  async execute(client, message, args) {
	const sender = new messageSender(message);

    try {
      const user = message.mentions.users.first() || message.author;
      const record = await InviteModel.findOne({ guildId: message.guild.id, userId: user.id });
      const count = record ? record.invitesCount : 0;

      sender.reply(sender.classic(
		`**${user.globalName}**, toplam \`${count}\` kişiyi davet ettin.`
	  ));
    } catch (err) {
      console.error(err);
      sender.reply(sender.errorEmbed('Bir hata oluştu.'));
    }
  },
};
