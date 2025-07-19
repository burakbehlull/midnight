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
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return sender.reply(sender.errorEmbed("❌ Geçerli bir kullanıcı belirt."));

    const settings = await Settings.findOne({ guildId: message.guild.id });
    if (!settings?.staffRole)
      return sender.reply(sender.errorEmbed("❌ `StaffRole` ayarlanmamış. `/settings` komutunu kullan."));

    await Staff.findOneAndUpdate(
      { userId: message.author.id, guildId: message.guild.id },
      {
        $inc: { startedStaffCount: 0 },
        $addToSet: { startedUsers: target.id },
        $set: { [`startedAt.${target.id}`]: new Date() },
      },
      { upsert: true, new: true }
    );

    try {
      await target.roles.add(settings.staffRole);
    } catch (err) {
      console.error(err);
      return sender.reply(sender.errorEmbed("❌ Rol verilirken bir hata oluştu. Botun rolü alttaysa rol veremez."));
    }

    sender.reply(sender.classic(`✅ ${target} adlı kullanıcıya <@&${settings.staffRole}> rolü verildi ve yetkili olarak başlatıldı.`));
  }
};
