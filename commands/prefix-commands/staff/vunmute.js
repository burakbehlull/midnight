import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  name: 'vunmute',
  description: 'Etiketlenen kullanıcının ses kanalındaki susturmasını kaldırır.',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);
      const sender = new messageSender(message);

      const ctrl = await PM.control(PM.flags.MuteMembers);
      if (!ctrl) return sender.reply(sender.errorEmbed("❌ Bu komutu kullanmak için `Üyeleri Sustur` yetkin olmalı."), true);

      const hedef = message.mentions.members.first();
      if (!hedef) return sender.reply(sender.errorEmbed("❌ Lütfen bir kullanıcı etiketleyin."), true);
	  
      if (!hedef.voice.channel) return sender.reply(sender.errorEmbed("❌ Bu kullanıcı bir ses kanalında değil."),true);

      if (!hedef.voice.serverMute) return sender.reply(sender.errorEmbed("❌ Bu kullanıcı zaten susturulmamış."), true);
      

      await hedef.voice.setMute(false, "Manuel olarak susturma kaldırıldı");
      await sender.reply(sender.classic(`🔊 ${hedef} kullanıcısının susturması kaldırıldı.`), true);

    } catch (err) {
      console.error("error: ", err);
      sender.reply(sender.errorEmbed("❌ Bir hata oluştu."));
    }
  },
};
