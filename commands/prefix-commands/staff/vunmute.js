import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'vunmute',
  description: 'Etiketlenen kullanıcının ses kanalındaki susturmasını kaldırır.',
  usage: '.vunmute @kullanıcı',
  category: 'moderation',

  permissions: {
    authorities: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Administrator],
  },
    
  
  async execute(client, message, args) {
    try {
      const sender = new Manager(client, { action: message }).sender;

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
