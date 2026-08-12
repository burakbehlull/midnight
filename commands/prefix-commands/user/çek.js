import Manager from '#managers';
import { Button } from '#helpers';

export default {
  name: 'çek',
  aliases: ["pull"],
  description: 'Etiketlenen kullanıcıdan onay alarak onu bulunduğun odaya çeker.',
  category: 'user',

  permissions: {
		enabled: false
	},

  async execute(client, message, args) {
    try {
		
      const sender = new Manager(client, { action: message });
	  
      const target = message.mentions.members.first();
      if (!target) return manager.sender.reply(manager.sender.errorEmbed("❌ Lütfen bir kullanıcı etiketleyin."), true);

      if (!target.voice.channel) return manager.sender.reply(manager.sender.errorEmbed("❌ Bu kullanıcı bir ses kanalında değil."));
      if (!message.member.voice.channel) return manager.sender.reply(manager.sender.errorEmbed("❌ Önce bir ses kanalına girmen gerekiyor."));

      const btn = new Button();
      btn.add(`cek-accept-${message.author.id}`, "✅ Kabul Et", btn.style.Success);
      btn.add(`cek-deny-${message.author.id}`, "❌ Reddet", btn.style.Danger);
      const row = btn.build();

	    const sentEmbed = manager.sender.classic(`${target}, ${message.author} seni bulunduğu odaya çekmek istiyor. Kabul ediyor musun?`)
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
		  const IEmbed = manager.sender.classic(`${target} başarıyla ${message.author}'ın yanına çekildi.`)
          await interaction.editReply({
            embeds: [IEmbed],
            components: []
          });
        } else {
		  const IEmbed = manager.sender.classic(`❌ ${target}, ${message.author}'ın çekme isteğini reddetti.`)
			
          await interaction.editReply({
            embeds: [IEmbed],
            components: []
          });
        }
        collector.stop();
      });

      collector.on("end", (_, reason) => {
        if (reason === "time") {
		  const sendEmbed = manager.sender.errorEmbed("⏰ İstek zaman aşımına uğradı.")
          sentMsg.edit({
            embeds: [sendEmbed],
            components: []
          });
        }
      });

    } catch (err) {
      console.error('[user/pull] error: ', err);
      manager.sender.reply(manager.sender.errorEmbed("❌ Bir hata oluştu."));
    }
  },
};
