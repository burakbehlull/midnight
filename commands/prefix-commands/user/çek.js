import { PermissionsManager } from '#managers';
import { messageSender, Button } from '#helpers';

export default {
  name: 'çek',
  description: 'Etiketlenen kullanıcıdan onay alarak onu bulunduğun odaya çeker.',
  async execute(client, message, args) {
    try {
		
      const sender = new messageSender(message);
	  /*
	  const PM = new PermissionsManager(message);	  
      const ctrl = await PM.control(PM.flags.MoveMembers);
      if (!ctrl) return sender.reply(sender.errorEmbed("❌ Bu komutu kullanmak için `Üyeleri Taşı` yetkin olmalı."));
	  */
	  
      const target = message.mentions.members.first();
      if (!target) return sender.reply(sender.errorEmbed("❌ Lütfen bir kullanıcı etiketleyin."), true);

      if (!target.voice.channel) return sender.reply(sender.errorEmbed("❌ Bu kullanıcı bir ses kanalında değil."));
      if (!message.member.voice.channel) return sender.reply(sender.errorEmbed("❌ Önce bir ses kanalına girmen gerekiyor."));

      const btn = new Button();
      btn.add(`cek-accept-${message.author.id}`, "✅ Kabul Et", btn.style.Success);
      btn.add(`cek-deny-${message.author.id}`, "❌ Reddet", btn.style.Danger);
      const row = btn.build();

	  const sentEmbed = sender.classic(`${target}, ${message.author} seni bulunduğu odaya çekmek istiyor. Kabul ediyor musun?`)
      const sentMsg = await message.channel.send({
        embeds: [sentEmbed],
        components: [row]
      });

      const filter = (i) =>
        i.user.id === target.id &&
        (i.customId === `cek-accept-${message.author.id}` || i.customId === `cek-deny-${message.author.id}`);

      const collector = sentMsg.createMessageComponentCollector({ filter, time: 30000 });

      collector.on("collect", async (interaction) => {
        await interaction.deferUpdate();
        if (interaction.customId === `cek-accept-${message.author.id}`) {
          await target.voice.setChannel(message.member.voice.channel);
		  const IEmbed = sender.classic(`${target} başarıyla ${message.author}'ın yanına çekildi.`)
          await interaction.editReply({
            embeds: [IEmbed],
            components: []
          });
        } else {
		  const IEmbed = sender.classic(`❌ ${target}, ${message.author}'ın çekme isteğini reddetti.`)
			
          await interaction.editReply({
            embeds: [IEmbed],
            components: []
          });
        }
        collector.stop();
      });

      collector.on("end", (_, reason) => {
        if (reason === "time") {
		  const sendEmbed = sender.errorEmbed("⏰ İstek zaman aşımına uğradı.")
          sentMsg.edit({
            embeds: [sendEmbed],
            components: []
          });
        }
      });

    } catch (err) {
      console.error('error: ', err);
      sender.reply(sender.errorEmbed("❌ Bir hata oluştu."));
    }
  },
};
