import { Economy } from '#models';
import { messageSender, Button } from '#helpers';

export default {
  name: 'fosterdismiss',
  description: 'Evli bir çift olarak evladını aileden uzaklaştır.',
  aliases: ['evlatat', 'dismiss', 'kov'],
  usage: '.fosterdismiss @kullanıcı',
  category: 'economy',

  permissions: {
    enabled: false
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const parentId = message.author.id;

    const parentData = await Economy.findOne({ userId: parentId }) || new Economy({ userId: parentId });

    if (!parentData.marriedTo) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Evlat atmak için önce evli olman gerek.'));
    }
    const partnerId = parentData.marriedTo;

    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!target) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Atmak istediğin evladı etiketlemelisin. Kullanım: `.fosterdismiss @kullanıcı`'));
    }

    if (target.id === parentId || target.id === partnerId) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Kendini veya eşini atamazsın.'));
    }

    const parentFosters = parentData.fosterlings || [];
    if (!parentFosters.includes(target.id)) {
      return manager.sender.reply(manager.sender.errorEmbed(`❌ **${target.username}** senin evladın değil, onu atamazsın.`));
    }

    const btns = new Button();
    btns.add('dismiss_confirm', '✅ Evet, At', btns.style.Danger);
    btns.add('dismiss_cancel', '❌ Hayır, İptal', btns.style.Secondary);
    const row = btns.build();

    const confirmEmbed = manager.sender.classic(
      `⚠️ <@${parentId}>, **${target.username}** adlı evladını aileden uzaklaştırmak istediğine emin misin?\n\n` +
      `Bu işlem geri alınamaz. Sadece <@${parentId}> butonları kullanabilir. 60 saniye içinde cevap ver!`
    );

    const confirmMsg = await message.channel.send({
      embeds: [confirmEmbed],
      components: [row],
      allowedMentions: { users: [parentId, partnerId, target.id] }
    });

    const collector = confirmMsg.createMessageComponentCollector({
      time: 60_000,
    });

    let answered = false;

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== parentId) {
        return interaction.reply({
          content: '❌ Bu butonları sadece komutu kullanan kişi kullanabilir.',
          ephemeral: true,
        });
      }

      answered = true;
      collector.stop('answered');

      try { await interaction.deferUpdate(); } catch (_) {}

      if (interaction.customId === 'dismiss_confirm') {
        const refreshedParent = await Economy.findOne({ userId: parentId });
        const refreshedPartner = await Economy.findOne({ userId: partnerId }) || new Economy({ userId: partnerId });

        if (!refreshedParent) {
          const fail = manager.sender.errorEmbed('❌ Ebeveyn verisi bulunamadı, işlem iptal edildi.');
          return confirmMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        if (!refreshedParent.marriedTo || refreshedParent.marriedTo !== partnerId) {
          const fail = manager.sender.errorEmbed('❌ Onaylandı ancak çift artık evli değil, işlem iptal edildi.');
          return confirmMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        const stillFoster = (refreshedParent.fosterlings || []).includes(target.id);
        if (!stillFoster) {
          const fail = manager.sender.errorEmbed(`❌ **${target.username}** zaten senin evladın değil, işlem iptal edildi.`);
          return confirmMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        refreshedParent.fosterlings = (refreshedParent.fosterlings || []).filter(id => id !== target.id);
        refreshedPartner.fosterlings = (refreshedPartner.fosterlings || []).filter(id => id !== target.id);

        await refreshedParent.save();
        await refreshedPartner.save();

        const successEmbed = manager.sender.classic(
          `🚨 **Aile Duyurusu!**\n\n` +
          `<@${parentId}> ve <@${partnerId}> çifti, **${target.username}** adlı evladını aileden uzaklaştırdı. 💔`
        );

        return confirmMsg.edit({ embeds: [successEmbed], components: [] }).catch(() => {});
      }

      if (interaction.customId === 'dismiss_cancel') {
        const cancelledEmbed = manager.sender.classic(
          `✅ İşlem iptal edildi. **${target.username}** hala ailenin bir parçası. 👨‍👩‍👧`
        );
        return confirmMsg.edit({ embeds: [cancelledEmbed], components: [] }).catch(() => {});
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'answered' || answered) return;
      const timeoutEmbed = manager.sender.errorEmbed(
        `⏰ İşlem zaman aşımına uğradı. 60 saniye içinde cevap verilmedi. **${target.username}** atılmadı.`
      );
      confirmMsg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
    });
  }
};
