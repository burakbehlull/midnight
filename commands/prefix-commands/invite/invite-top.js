import { InviteModel } from "#models"
import { messageSender } from "#helpers";

export default {
  name: 'invite-top',
  aliases: ["davet-tablosu", "invites-top", "davet-sıralama"],
  description: 'Sunucunun en çok davet eden ilk 5 kişisini gösterir.',
  usage: "invite-top",
  async execute(client, message, args) {
	const sender = new messageSender(message);

    try {
      const top = await InviteModel.find({ guildId: message.guild.id })
        .sort({ invitesCount: -1 })
        .limit(5);

      if (!top.length) return sender.reply(sender.errorEmbed('Hiç davet eden kişi yok.'));

      const list = top.map((r, i) => `${i + 1}. <@${r.userId}> — ${r.invitesCount} davet`).join('\n');

      message.channel.send({embeds: [sender.classic(`**Davet Sıralaması:**\n${list}`)]});
    } catch (err) {
      console.error(err);
      sender.reply(sender.errorEmbed('Bir hata oluştu.'));
    }
  },
};
