import { Button } from '#helpers';
import Manager from '#managers';

import { Economy } from '#models';

export default {
  name: 'marry',
  description: 'Bir kullanıcı ile evlen ya da evlilik durumunu gör.',
  aliases: ['evlen', 'evli'],
  usage: '.marry [@kullanıcı] [yüzükId]',
  category: 'economy',

  permissions: {
    enabled: false
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const authorId = message.author.id;

    const authorData = await Economy.findOne({ userId: authorId }) || new Economy({ userId: authorId });

    if (authorData.marriedTo) {
      const partner = await client.users.fetch(authorData.marriedTo).catch(() => null);
      const partnerName = partner ? partner.username : 'Bilinmeyen Kullanıcı';

      const marriedDate = authorData.marriageSince ? new Date(authorData.marriageSince) : new Date();
      const diffTime = Math.abs(new Date() - marriedDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return manager.sender.reply(
        `💍 **${partnerName}** ile **${diffDays}** gündür evlisiniz! ❤️`
      );
    }

    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    const ringId = args[1];

    if (!target) 
      return manager.sender.reply(manager.sender.errorEmbed('❌ Evlenmek istediğin kişiyi etiketlemelisin. Kullanım: `.marry @kullanıcı yüzükId`'));

    if (target.id === authorId)
      return manager.sender.reply(manager.sender.errorEmbed('❌ Kendinle evlenemezsin.'));

    if (target.bot)
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bir bot ile evlenemezsin.'));

    const targetData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

    if (targetData.marriedTo) 
      return manager.sender.reply(manager.sender.errorEmbed(`❌ **${target.username}** zaten başkasıyla evli.`));

    if (!ringId || !['2', '3', '4'].includes(ringId)) 
      return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli bir yüzük ID girmelisin. (Örn: 2, 3 veya 4)'));

    const inventoryCount = authorData.inventory.get(ringId) || 0;
    if (inventoryCount < 1) 
      return manager.sender.reply(manager.sender.errorEmbed('❌ Envanterinde bu yüzükten bulunmuyor.'));

    const btns = new Button();
    btns.add('marry_accept', '✅ Kabul Et', btns.style.Success);
    btns.add('marry_reject', '❌ Reddet',  btns.style.Danger);
    const row = btns.build();

    const proposalEmbed = manager.sender.classic(
      `💍 **${message.author.username}**, **${target.username}** ile evlenmek istiyor!\n\n` +
      `Sadece <@${target.id}> butonları kullanabilir. 60 saniye içinde cevap ver!`
    );

    const proposalMsg = await message.channel.send({
      embeds: [proposalEmbed],
      components: [row],
      allowedMentions: { users: [target.id] }
    });

    const collector = proposalMsg.createMessageComponentCollector({
      time: 60_000,
    });

    let answered = false;

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== target.id) {
        return interaction.reply({ content: '❌ Bu butonları sadece teklif alan kişi kullanabilir.', ephemeral: true });
      }

      answered = true;
      collector.stop('answered');

      try {
        await interaction.deferUpdate();
      } catch (_) {}

      if (interaction.customId === 'marry_accept') {
        const refreshedAuthorData = await Economy.findOne({ userId: authorId }) || new Economy({ userId: authorId });
        const refreshedTargetData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

        const stock = refreshedAuthorData.inventory.get(ringId) || 0;
        if (stock < 1) {
          const fail = manager.sender.errorEmbed('❌ Kabul edildi ama yüzük envanterinden çıkmış, işlem iptal edildi.');
          return proposalMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        if (refreshedAuthorData.marriedTo || refreshedTargetData.marriedTo) {
          const fail = manager.sender.errorEmbed('❌ Kabul edildi ancak biriniz artık evlisiniz, işlem iptal edildi.');
          return proposalMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        refreshedAuthorData.inventory.set(ringId, stock - 1);

        const now = new Date();
        refreshedAuthorData.marriedTo = target.id;
        refreshedAuthorData.marriageSince = now;

        refreshedTargetData.marriedTo = authorId;
        refreshedTargetData.marriageSince = now;

        await refreshedAuthorData.save();
        await refreshedTargetData.save();

        const successEmbed = manager.sender.classic(
          `🎉 Tebrikler! **${message.author.username}** ile **${target.username}** artık evli! 💍❤️`
        );

        return proposalMsg.edit({ embeds: [successEmbed], components: [] }).catch(() => {});
      }

      if (interaction.customId === 'marry_reject') {
        const rejectedEmbed = manager.sender.classic(
          `💔 **${target.username}**, evlenme teklifini reddetti. Yüzük envantere iade edildi.`
        );
        return proposalMsg.edit({ embeds: [rejectedEmbed], components: [] }).catch(() => {});
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'answered') return;
      if (answered) return;
      const timeoutEmbed = manager.sender.errorEmbed(`⏰ Evlenme teklifi zaman aşımına uğradı. **${target.username}** cevap vermedi.`);
      proposalMsg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
    });
  }
};
