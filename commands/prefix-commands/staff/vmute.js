import ms from 'ms';

import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';
import { Punishment } from '#models';

export default {
  name: 'vmute',
  description: 'Etiketlenen kullanıcıyı belirli bir süre boyunca ses kanalında susturur.',
  usage: '.vunmute <@kullanıcı> <süre | 1m | 1h> <sebep>',
  category: 'moderation',

  permissions: {
    authorities: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Administrator],
  },
    
  
  async execute(client, message, args) {
    try {
      const sender = new Manager(client, { action: message }).sender;

      const target = message.mentions.members.first();
	  
      if (!target) return sender.reply(sender.errorEmbed("❌ Lütfen bir kullanıcı etiketleyin."), true);
      if (!target.voice.channel) return sender.reply(sender.errorEmbed("❌ Bu kullanıcı bir ses kanalında değil."), true);
      
	  if (!args[1]) return sender.reply(sender.errorEmbed("❌ Lütfen bir süre belirtin. Örnek: `.vmute @kullanıcı 10m Sebep`"), true);

      const süre = ms(args[1]);
      if (!süre || süre < 1000) return sender.reply("❌ Geçerli bir süre girin. Örn: `10m`, `1h`, `30s`", true);

      const sebep = args.slice(2).join(" ") || "Belirtilmedi";

      await target.voice.setMute(true, sebep);
      await sender.reply(sender.classic(`🔇 ${target} kullanıcısı **${args[1]}** boyunca ses kanalında susturuldu.`), true);

      await Punishment.create({
        userId: target.id,
        guildId: message.guild.id,
        staffId: message.author.id,
        type: "vmute",
        duration: args[1] || null,
        reason
      });
      
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
