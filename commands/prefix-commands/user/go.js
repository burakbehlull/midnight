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
  
  async execute(client, message, args) {
    try {
      const manager = new Manager(client, { action: message });
	 
	  
      const targetUser = message.mentions.members.first();
      if (!targetUser) return manager.sender.reply(manager.sender.errorEmbed("❌ Lütfen bir kullanıcı etiketleyin."));

      if (!targetUser.voice.channel) return manager.sender.reply(manager.sender.errorEmbed("❌ Bu kullanıcı bir ses kanalında değil."));
      if (!message.member.voice.channel) return manager.sender.reply(manager.sender.errorEmbed("❌ Önce bir ses kanalına girmen gerekiyor."));

      const btn = new Button();
      btn.add(`git-accept-${message.author.id}`, "✅ Kabul Et", btn.style.Success);
      btn.add(`git-deny-${message.author.id}`, "❌ Reddet", btn.style.Danger);
      const row = btn.build();

	  const sentEmbed = manager.sender.classic(`${targetUser} \n ${message.author} senin yanına gelmek istiyor. Kabul ediyor musun?`)
      await message.channel.send({
        embeds: [sentEmbed],
        components: [row]
      }).catch(() => {
        return manager.sender.reply(manager.sender.errorEmbed("❌ İstek gönderilemedi."));
      });

      const filter = (i) =>
        i.user.id === targetUser.id &&
        (i.customId === `git-accept-${message.author.id}` || i.customId === `git-deny-${message.author.id}`);

      const collector = message.channel.createMessageComponentCollector({ filter, time: 30000 });

      collector.on("collect", async (interaction) => {
        await interaction.deferUpdate();
        if (interaction.customId === `git-accept-${message.author.id}`) {
          await message.member.voice.setChannel(targetUser.voice.channel);
		  const embed = manager.sender.classic(`${message.author} başarıyla yanına taşındı.`)
          await interaction.followUp({ embeds: [embed], ephemeral: true });
        } else {
		  const embed = manager.sender.errorEmbed(`❌ ${message.author} isteği reddedildi.`)
          await interaction.followUp({ embeds: [embed], ephemeral: true });
        }
        collector.stop();
      });

      collector.on("end", (_, reason) => {
		const embed = manager.sender.errorEmbed("⏰ İstek zaman aşımına uğradı.")
        if (reason === "time") {
          targetUser.send({embeds: [embed]});
        }
      });

    } catch (err) {
      console.error('[user/go] error: ', err);
      message.reply(manager.sender.errorEmbed("❌ Bir hata oluştu."));
    }
  },
};
