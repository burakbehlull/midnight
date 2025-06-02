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
      if (!ctrl) return sender.reply("❌ Bu komutu kullanmak için `Üyeleri Taşı` yetkin olmalı.", true);
	  */
	  
      const target = message.mentions.members.first();
      if (!target) return sender.reply("❌ Lütfen bir kullanıcı etiketleyin.", true);

      if (!target.voice.channel) return sender.reply("❌ Bu kullanıcı bir ses kanalında değil.", true);
      if (!message.member.voice.channel) return sender.reply("❌ Önce bir ses kanalına girmen gerekiyor.", true);

      const btn = new Button();
      btn.add(`cek-accept-${message.author.id}`, "✅ Kabul Et", btn.style.Success);
      btn.add(`cek-deny-${message.author.id}`, "❌ Reddet", btn.style.Danger);
      const row = btn.build();

      const sentMsg = await message.channel.send({
        content: `${target}, ${message.author} seni bulunduğu odaya çekmek istiyor. Kabul ediyor musun?`,
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
          await interaction.editReply({
            content: `${target} başarıyla ${message.author}'ın yanına çekildi.`,
            components: []
          });
        } else {
          await interaction.editReply({
            content: `❌ ${target}, ${message.author}'ın çekme isteğini reddetti.`,
            components: []
          });
        }
        collector.stop();
      });

      collector.on("end", (_, reason) => {
        if (reason === "time") {
          sentMsg.edit({
            content: "⏰ İstek zaman aşımına uğradı.",
            components: []
          });
        }
      });

    } catch (err) {
      console.error('error: ', err);
      message.reply("❌ Bir hata oluştu.");
    }
  },
};
