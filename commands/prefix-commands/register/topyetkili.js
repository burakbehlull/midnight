import { Staff } from "#models";

export default {
  name: "topyetkili",
  aliases: ["topofficial"],
  description: "Yetkili kullanıcıları gösterir",
  usage: "topyetkili",
  category: 'register',
  
  async execute(client, message) {
    const top = await Staff.find({ guildId: message.guild.id })
      .sort({ startedStaffCount: -1 })
      .limit(10);

    const list = top.map((user, i) =>
      `${i + 1}. <@${user.userId}> - ${user.startedStaffCount} başlatma`
    ).join("\n");

    message.channel.send({
      embeds: [{
        title: "Top Yetkililer",
        description: list || "Liste boş.",
        color: 0x2ecc71
      }]
    });
  }
};
