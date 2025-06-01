import { PermissionsManager } from '../../../managers/index.js';
import { messageSender } from '../../../helpers/index.js';

export default {
  name: 'vunmute',
  description: 'Etiketlenen kullanıcının ses kanalındaki susturmasını kaldırır.',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);
      const sender = new messageSender(message);

      const kontrol = await PM.control(PM.flags.MuteMembers);
      if (!kontrol) return sender.reply("❌ Bu komutu kullanmak için `Üyeleri Sustur` yetkin olmalı.", true);

      const hedef = message.mentions.members.first();
      if (!hedef) return sender.reply("❌ Lütfen bir kullanıcı etiketleyin.", true);
      if (!hedef.voice.channel) return sender.reply("❌ Bu kullanıcı bir ses kanalında değil.", true);

      if (!hedef.voice.serverMute) {
        return sender.reply("❌ Bu kullanıcı zaten susturulmamış.", true);
      }

      await hedef.voice.setMute(false, "Manuel olarak susturma kaldırıldı");
      await sender.reply(`🔊 ${hedef} kullanıcısının susturması kaldırıldı.`, true);

    } catch (err) {
      console.error("error: ", err);
      message.reply("❌ Bir hata oluştu.");
    }
  },
};
