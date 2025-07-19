import { Staff } from "#models";
import { Settings } from "#models";
import { messageSender } from "#helpers";

export default {
  name: "yetkibaslat",
  aliases: ["yetkibaşlat", "authorizedstart"],
  description: "Bir kullanıcıyı yetkili olarak başlatır.",
  usage: ".yetkibaşlat @kullanıcı",
  category: "register",

  async execute(client, message, args) {
    const sender = new messageSender(message);
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;
    const isSelf = message.author.id === target.id;

    const settings = await Settings.findOne({ guildId: message.guild.id });
    if (!settings?.staffRole)
      return sender.reply(sender.errorEmbed("❌ `StaffRole` ayarlanmamış. `/settings` komutunu kullan."));

    // Eğer hedef zaten staff rolüne sahipse
    if (target.roles.cache.has(settings.staffRole)) {
      return sender.reply(
        sender.errorEmbed(`${target} zaten <@&${settings.staffRole}> rolüne sahip.`)
      );
    }

    const now = new Date();

    await Staff.findOneAndUpdate(
      { userId: message.author.id, guildId: message.guild.id },
      {
        $inc: { startedStaffCount: isSelf ? 0 : 1 },
        $addToSet: { startedUsers: target.id },
        $set: { [`startedAt.${target.id}`]: now },
      },
      { upsert: true, new: true }
    );

    try {
      await target.roles.add(settings.staffRole);
    } catch (err) {
      console.error(err);
      return sender.reply(sender.errorEmbed("❌ Rol verilirken bir hata oluştu. Botun rolü alttaysa rol veremez."));
    }

    const formattedDate = now.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    sender.reply(
      sender.classic(
        `${target} adlı kullanıcıya <@&${settings.staffRole}> rolü verildi ve **${formattedDate}** tarihinde yetkili olarak başlatıldı.`
      )
    );
  },
};
