import { Staff } from "#models";
import Manager from "#managers";


export default {
  name: "yetkililerim",
  aliases: ["myofficials"],
  description: "Kullanıcının çektiği yetkilileri gösterir",
  usage: "yetkililerim",
  category: 'register',

  permissions: {
      authorities: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Administrator],
  },
  
  async execute(client, message) {
	const sender = new Manager(client, { action: message }).sender;

    const staff = await Staff.findOne({ userId: message.author.id, guildId: message.guild.id });

    if (!staff?.startedUsers?.length) return sender.reply(sender.errorEmbed("❌ Hiç yetkili başlatmamışsın."));

    const list = staff.startedUsers.map((id, i) => `${i + 1}. <@${id}>`).join("\n");

    message.channel.send({
      embeds: [{
        title: "Başlattığın Yetkililer",
        description: list,
        color: 0x3498db
      }]
    });
  }
};
