import { PermissionsManager } from '#managers';
import { messageSender, Button } from '#helpers';

export default {
  name: 'git',
  aliases: ["go"],
  description: 'Belirtilen kullanıcıdan izin alarak onun olduğu odaya gider.',
  category: 'user',
  
  async execute(client, message, args) {
    try {
      const sender = new messageSender(message);
	  /*
      const PM = new PermissionsManager(message);
      const ctrl = await PM.control(PM.flags.MoveMembers);
      if (!ctrl) return sender.reply(sender.errorEmbed("❌ Bu komutu kullanmak için `Üyeleri Taşı` yetkin olmalı."));
	  */
	  
      const targetUser = message.mentions.members.first();
      if (!targetUser) return sender.reply(sender.errorEmbed("❌ Lütfen bir kullanıcı etiketleyin."));

      if (!targetUser.voice.channel) return sender.reply(sender.errorEmbed("❌ Bu kullanıcı bir ses kanalında değil."));
      if (!message.member.voice.channel) return sender.reply(sender.errorEmbed("❌ Önce bir ses kanalına girmen gerekiyor."));

      const btn = new Button();
      btn.add(`git-accept-${message.author.id}`, "✅ Kabul Et", btn.style.Success);
      btn.add(`git-deny-${message.author.id}`, "❌ Reddet", btn.style.Danger);
      const row = btn.build();

	  const sentEmbed = sender.classic(`${targetUser} \n ${message.author} senin yanına gelmek istiyor. Kabul ediyor musun?`)
      await message.channel.send({
        embeds: [sentEmbed],
        components: [row]
      }).catch(() => {
        return sender.reply(sender.errorEmbed("❌ İstek gönderilemedi."));
      });

      const filter = (i) =>
        i.user.id === targetUser.id &&
        (i.customId === `git-accept-${message.author.id}` || i.customId === `git-deny-${message.author.id}`);

      const collector = message.channel.createMessageComponentCollector({ filter, time: 30000 });

      collector.on("collect", async (interaction) => {
        await interaction.deferUpdate();
        if (interaction.customId === `git-accept-${message.author.id}`) {
          await message.member.voice.setChannel(targetUser.voice.channel);
		  const embed = sender.classic(`${message.author} başarıyla yanına taşındı.`)
          await interaction.followUp({ embeds: [embed], ephemeral: true });
        } else {
		  const embed = sender.errorEmbed(`❌ ${message.author} isteği reddedildi.`)
          await interaction.followUp({ embeds: [embed], ephemeral: true });
        }
        collector.stop();
      });

      collector.on("end", (_, reason) => {
		const embed = sender.errorEmbed("⏰ İstek zaman aşımına uğradı.")
        if (reason === "time") {
          targetUser.send({embeds: [embed]});
        }
      });

    } catch (err) {
      console.error('error: ', err);
      message.reply(sender.errorEmbed("❌ Bir hata oluştu."));
    }
  },
};
