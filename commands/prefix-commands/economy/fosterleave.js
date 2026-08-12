import { Economy } from '#models';
import { Button } from '#helpers';
import Manager from '#managers';

export default {
  name: 'fosterleave',
  description: 'Aileden ayrıl.',
  aliases: ['ailedenayrıl', 'ailedenayril', 'leavefamily', 'ailedencık', 'ailedencik'],
  usage: '.fosterleave',
  category: 'economy',

  permissions: {
    enabled: false
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const userId = message.author.id;

    const userData = await Economy.findOne({ userId: userId }) || new Economy({ userId: userId });

    const parentEntry = await Economy.findOne({ fosterlings: userId }).lean();

    if (!parentEntry) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Zaten kayıtlı bir ailen yok, ayrılacak bir ailen bulunamadı.'));
    }

    const parentId = parentEntry.userId;
    const partnerId = parentEntry.marriedTo;

    const btns = new Button();
    btns.add('leave_confirm', '✅ Evet, Ayrıl', btns.style.Danger);
    btns.add('leave_cancel', '❌ Hayır, İptal', btns.style.Secondary);
    const row = btns.build();

    let parentsText = `<@${parentId}>`;
    if (partnerId) parentsText += ` ve <@${partnerId}>`;

    const confirmEmbed = manager.sender.classic(
      `⚠️ <@${userId}>, aileden ${parentsText} ayrılmak istediğine emin misin?\n\n` +
      `Bu işlem geri alınamaz. Sadece <@${userId}> butonları kullanabilir. 60 saniye içinde cevap ver!`
    );

    const confirmMsg = await message.channel.send({
      embeds: [confirmEmbed],
      components: [row],
      allowedMentions: { users: [userId, parentId, partnerId].filter(Boolean) }
    });

    const collector = confirmMsg.createMessageComponentCollector({
      time: 60_000,
    });

    let answered = false;

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: '❌ Bu butonları sadece komutu kullanan kişi kullanabilir.',
          ephemeral: true,
        });
      }

      answered = true;
      collector.stop('answered');

      try { await interaction.deferUpdate(); } catch (_) {}

      if (interaction.customId === 'leave_confirm') {
        const refreshedParent = await Economy.findOne({ userId: parentId });

        if (!refreshedParent) {
          const fail = manager.sender.errorEmbed('❌ Aile verisi bulunamadı, işlem iptal edildi.');
          return confirmMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        const stillInFamily = (refreshedParent.fosterlings || []).includes(userId);
        if (!stillInFamily) {
          const fail = manager.sender.errorEmbed('❌ Zaten aileden çıkarılmışsın, işlem iptal edildi.');
          return confirmMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        refreshedParent.fosterlings = (refreshedParent.fosterlings || []).filter(id => id !== userId);
        await refreshedParent.save();

        if (partnerId) {
          const refreshedPartner = await Economy.findOne({ userId: partnerId }) || new Economy({ userId: partnerId });
          refreshedPartner.fosterlings = (refreshedPartner.fosterlings || []).filter(id => id !== userId);
          await refreshedPartner.save();
        }

        const successEmbed = manager.sender.classic(
          `🚨 **Aile Duyurusu!**\n\n` +
          `**${message.author.username}**, ailesinden ${parentsText} gönüllü olarak ayrıldı! 👋`
        );

        return confirmMsg.edit({ embeds: [successEmbed], components: [] }).catch(() => {});
      }

      if (interaction.customId === 'leave_cancel') {
        const cancelledEmbed = manager.sender.classic(
          `✅ Ayrılma işlemi iptal edildi. Hala ailesinin ${parentsText} bir parçasısın! ❤️`
        );
        return confirmMsg.edit({ embeds: [cancelledEmbed], components: [] }).catch(() => {});
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'answered' || answered) return;
      const timeoutEmbed = manager.sender.errorEmbed(
        `⏰ Ayrılma işlemi zaman aşımına uğradı. 60 saniye içinde cevap verilmedi. Hala ailesinin bir parçasısın.`
      );
      confirmMsg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
    });
  }
};
