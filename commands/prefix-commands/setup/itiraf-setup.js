import { EmbedBuilder, ButtonStyle } from 'discord.js';

import { messageSender, Button } from '#helpers';
import { Settings } from '#models';
import { PermissionsManager } from '#managers';

export default {
  name: 'itiraf-setup',
  description: 'İtiraf sistemini kurar, sadece yöneticiler kullanabilir.',
  usage: 'itiraf-setup <#channel>',
  cooldown: 10,
  category: "fun",
  async execute(client, message, args) {
	  
	const PM = new PermissionsManager(message);
    const sender = new messageSender(message);
	
    try {
		
	  const ctrl = await PM.control(PM.flags.Administrator);
      if (!ctrl) return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için yeterli yetkin yok.'));
      
		
      const channel = message.mentions.channels.first();
      if (!channel) return sender.reply(sender.errorEmbed('❌ Lütfen bir kanal etiketle.'));

	  const embed = sender.embed({
		   author: { name: message.guild.name, iconURL: message.guild.iconURL() },
		   title: "İtiraf Kutusu",
		   color: sender.colors.iceBlue,
		   description: "**Aşağıdaki butonlardan birini seçerek itirafını gönderebilirsin.**"
	  })


      const btn = new Button();
      btn.add('anonim_itiraf', 'Anonim İtiraf', btn.style.Primary);
      btn.add('acik_itiraf', 'Açık İtiraf', btn.style.Success);

      await Settings.findOneAndUpdate(
        { guildId: message.guild.id },
        { confessionChannelId: channel.id },
        { upsert: true, new: true }
      );

      await message.channel.send({
        embeds: [embed],
        components: [btn.build()],
      });

      // await sender.reply(sender.classic('İtiraf paneli başarıyla kuruldu.'));
    } catch (err) {
      console.error('[itiraf-setup] error: ', err);
      await sender.reply(sender.errorEmbed('Bir hata oluştu.'));
    }
  },
};
