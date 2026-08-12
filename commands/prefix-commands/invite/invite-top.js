import Manager from "#managers";

import { InviteModel } from "#models"

export default {
  name: 'invite-top',
  aliases: ["davet-tablosu", "invites-top", "davet-sıralama"],
  description: 'Sunucunun en çok davet eden ilk 5 kişisini gösterir.',
  usage: "invite-top",
  category: 'invite',

  permissions: {
    enabled: false
  },
  async execute(client, message, args) {
	  const manager = new Manager(client, { action: message });

    try {
      const top = await InviteModel.find({ guildId: message.guild.id })
        .sort({ invitesCount: -1 })
        .limit(5);

      if (!top.length) return manager.sender.reply(manager.sender.errorEmbed('Hiç davet eden kişi yok.'));

      const list = top.map((r, i) => `${i + 1}. <@${r.userId}> — ${r.invitesCount} davet`).join('\n');

      message.channel.send({embeds: [manager.sender.classic(`**Davet Sıralaması:**\n${list}`)]});
    } catch (err) {
      console.error(err);
      manager.sender.reply(manager.sender.errorEmbed('Bir hata oluştu.'));
    }
  },
};
