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
      if (!ctrl) return sender.reply(sender.errorEmbed("❌ Bu komutu kullanmak için `Üyeleri Sustur` yetkin olmalı."), true);

      const target = message.mentions.members.first();
	  
      if (!target) return sender.reply(sender.errorEmbed("❌ Lütfen bir kullanıcı etiketleyin."), true);
      if (!target.voice.channel) return sender.reply(sender.errorEmbed("❌ Bu kullanıcı bir ses kanalında değil."), true);
      
	  if (!args[1]) return sender.reply(sender.errorEmbed("❌ Lütfen bir süre belirtin. Örnek: `.vmute @kullanıcı 10m Sebep`"), true);

      const süre = ms(args[1]);
      if (!süre || süre < 1000) return sender.reply("❌ Geçerli bir süre girin. Örn: `10m`, `1h`, `30s`", true);

      const sebep = args.slice(2).join(" ") || "Belirtilmedi";

      await target.voice.setMute(true, sebep);
      await sender.reply(sender.classic(`🔇 ${target} kullanıcısı **${args[1]}** boyunca ses kanalında susturuldu.`), true);

      setTimeout(async () => {
        if (target.voice.channel && target.voice.serverMute) {
          await target.voice.setMute(false, "Süre doldu");
		  const IEmbed = sender.classic(`🔊 ${target} kullanıcısının susturulma süresi sona erdi.`)
          message.channel.send({embeds: [IEmbed]});
        }
      }, süre);

    } catch (err) {
      console.error("error: ", err);
      message.reply(sender.errorEmbed("❌ Bir hata oluştu."));
    }
  },
};
