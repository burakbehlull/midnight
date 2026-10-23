import Manager from '#managers';
import { Button } from '#helpers';

export default {
  name: 'git',
  aliases: ["go"],
  description: 'Belirtilen kullanıcıdan izin alarak onun olduğu odaya gider.',
  category: 'user',

  permissions: {
		enabled: false
	},
  
  async execute(client, message) {
    try {
      const manager = new Manager(client, { action: message });
	 
	  
      const targetUser = message.mentions.members.first();
      if (!targetUser) return manager.sender.reply(manager.sender.errorEmbed("❌ Lütfen bir kullanıcı etiketleyin."));

      if (!targetUser.voice.channel) return manager.sender.reply(manager.sender.errorEmbed("❌ Bu kullanıcı bir ses kanalında değil."));
      if (!message.member.voice.channel) return manager.sender.reply(manager.sender.errorEmbed("❌ Önce bir ses kanalına girmen gerekiyor."));

      const btn = new Button();
      btn.add(`git-accept-${message.author.id}`, "Kabul Et", btn.style.Success);
      btn.add(`git-deny-${message.author.id}`, "Reddet", btn.style.Danger);
      const row = btn.build();

	  const sentEmbed = manager.sender.classic(`${targetUser} \n ${message.author} senin yanına gelmek istiyor. Kabul ediyor musun?`)
      let sentMessage;
      try {
        sentMessage = await message.channel.send({
          embeds: [sentEmbed],
          components: [row]
        });
      } catch {
        return manager.sender.reply(manager.sender.errorEmbed("❌ İstek gönderilemedi."));
      }

      const filter = (i) =>
        i.user.id === targetUser.id &&
        (i.customId === `git-accept-${message.author.id}` || i.customId === `git-deny-${message.author.id}`);

      const collector = message.channel.createMessageComponentCollector({ filter, time: 30000 });

      collector.on("collect", async (interaction) => {
        await interaction.deferUpdate();
        if (interaction.customId === `git-accept-${message.author.id}`) {
          await message.member.voice.setChannel(targetUser.voice.channel);
          const embed = manager.sender.classic(`${targetUser} isteği kabul etti.\n${message.author} yanına taşındı.`)
          await sentMessage.edit({ embeds: [embed], components: [] }).catch(() => {});
        } else {
          const embed = manager.sender.errorEmbed(`❌ ${targetUser} isteği reddetti.\n${message.author} taşınmadı.`)
          await sentMessage.edit({ embeds: [embed], components: [] }).catch(() => {});
        }
        collector.stop();
      });

      collector.on("end", async (_, reason) => {
        if (reason !== "time") return;
        const embed = manager.sender.errorEmbed("⏰ İstek zaman aşımına uğradı.")
        await sentMessage.edit({ embeds: [embed], components: [] }).catch(() => {});
        targetUser.send({ embeds: [embed] }).catch(() => {});
      });

    } catch (err) {
      console.error('[user/go] error: ', err);
      message.reply(manager.sender.errorEmbed("❌ Bir hata oluştu."));
    }
  },
};
