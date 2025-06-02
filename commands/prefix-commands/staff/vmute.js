import ms from 'ms';

import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  name: 'vmute',
  description: 'Etiketlenen kullanıcıyı belirli bir süre boyunca ses kanalında susturur.',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);
      const sender = new messageSender(message);

      const ctrl = await PM.control(PM.flags.MuteMembers);
      if (!ctrl) return sender.reply("❌ Bu komutu kullanmak için `Üyeleri Sustur` yetkin olmalı.", true);

      const hedef = message.mentions.members.first();
      if (!hedef) return sender.reply("❌ Lütfen bir kullanıcı etiketleyin.", true);
      if (!hedef.voice.channel) return sender.reply("❌ Bu kullanıcı bir ses kanalında değil.", true);
      if (!args[1]) return sender.reply("❌ Lütfen bir süre belirtin. Örnek: `.vmute @kullanıcı 10m Sebep`", true);

      const süre = ms(args[1]);
      if (!süre || süre < 1000) return sender.reply("❌ Geçerli bir süre girin. Örn: `10m`, `1h`, `30s`", true);

      const sebep = args.slice(2).join(" ") || "Belirtilmedi";

      await hedef.voice.setMute(true, sebep);
      await sender.reply(`🔇 ${hedef} kullanıcısı **${args[1]}** boyunca ses kanalında susturuldu.`, true);

      setTimeout(async () => {
        if (hedef.voice.channel && hedef.voice.serverMute) {
          await hedef.voice.setMute(false, "Süre doldu");
          message.channel.send(`🔊 ${hedef} kullanıcısının susturulma süresi sona erdi.`);
        }
      }, süre);

    } catch (err) {
      console.error("error: ", err);
      message.reply("❌ Bir hata oluştu.");
    }
  },
};
