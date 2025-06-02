import { PermissionsManager } from '#managers';
import { messageSender, Button } from '#helpers';

export default {
  name: 'git',
  description: 'Belirtilen kullanıcıdan izin alarak onun olduğu odaya gider.',
  async execute(client, message, args) {
    try {
      const sender = new messageSender(message);
	  /*
      const PM = new PermissionsManager(message);
      const ctrl = await PM.control(PM.flags.MoveMembers);
      if (!ctrl) return sender.reply("❌ Bu komutu kullanmak için `Üyeleri Taşı` yetkin olmalı.", true);
	  */
	  
      const targetUser = message.mentions.members.first();
      if (!targetUser) return sender.reply("❌ Lütfen bir kullanıcı etiketleyin.", true);

      if (!targetUser.voice.channel) return sender.reply("❌ Bu kullanıcı bir ses kanalında değil.", true);
      if (!message.member.voice.channel) return sender.reply("❌ Önce bir ses kanalına girmen gerekiyor.", true);

      const btn = new Button();
      btn.add(`git-accept-${message.author.id}`, "✅ Kabul Et", btn.style.Success);
      btn.add(`git-deny-${message.author.id}`, "❌ Reddet", btn.style.Danger);
      const row = btn.build();

      await message.channel.send({
        content: `${targetUser} \n ${message.author} senin yanına gelmek istiyor. Kabul ediyor musun?`,
        components: [row]
      }).catch(() => {
        return sender.reply("❌ Kullanıcının DM kutusu kapalı olduğu için istek gönderilemedi.");
      });

      const filter = (i) =>
        i.user.id === targetUser.id &&
        (i.customId === `git-accept-${message.author.id}` || i.customId === `git-deny-${message.author.id}`);

      const collector = message.channel.createMessageComponentCollector({ filter, time: 30000 });

      collector.on("collect", async (interaction) => {
        await interaction.deferUpdate();
        if (interaction.customId === `git-accept-${message.author.id}`) {
          await message.member.voice.setChannel(targetUser.voice.channel);
          await interaction.followUp({ content: `✅${message.author} başarıyla yanına taşındı.`, ephemeral: true });
        } else {
          await interaction.followUp({ content: `❌ ${message.author} isteği reddedildi.`, ephemeral: true });
        }
        collector.stop();
      });

      collector.on("end", (_, reason) => {
        if (reason === "time") {
          targetUser.send("⏰ İstek zaman aşımına uğradı.");
        }
      });

    } catch (err) {
      console.error('error: ', err);
      message.reply("❌ Bir hata oluştu.");
    }
  },
};
