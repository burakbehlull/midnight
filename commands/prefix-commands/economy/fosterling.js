import { Economy } from '#models';
import { messageSender, Button } from '#helpers';

const CERTIFICATE_ID = '8';

export default {
  name: 'fosterling',
  description: 'Evli bir cift olarak evlat edin.',
  aliases: ['evlatlık', 'evlat', 'foster', 'evlatedin'],
  usage: '.fosterling @kullanıcı',
  category: 'economy',

  async execute(client, message, args) {
    const sender = new messageSender(message);
    const parentId = message.author.id;

    const parentData = await Economy.findOne({ userId: parentId }) || new Economy({ userId: parentId });

    if (!parentData.marriedTo) {
      return sender.reply(sender.errorEmbed('❌ Evlat edinmek için önce evli olman gerek.'));
    }
    const partnerId = parentData.marriedTo;

    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!target) {
      return sender.reply(sender.errorEmbed('❌ Evlat edinmek istediğin kişiyi etiketlemelisin. Kullanım: `.fosterling @kullanıcı`'));
    }

    if (target.id === parentId || target.id === partnerId) {
      return sender.reply(sender.errorEmbed('❌ Kendini veya eşini evlat edinemezsin.'));
    }

    if (target.bot) {
      return sender.reply(sender.errorEmbed('❌ Bir botu evlat edinemezsin.'));
    }

    const targetData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

    const alreadyFoster = await Economy.exists({ fosterlings: target.id });
    if (alreadyFoster) {
      return sender.reply(sender.errorEmbed(`❌ **${target.username}** zaten başka bir ailenin evladı.`));
    }

    const stock = parentData.inventory.get(CERTIFICATE_ID) || 0;
    if (stock < 1) {
      return sender.reply(
        sender.errorEmbed('❌ Envanterinde **Evlat Edinme Belgesi** (ID: 8) yok. Satın almak için shop komutunu kullanabilirsin.')
      );
    }

    const btns = new Button();
    btns.add('foster_accept', '✅ Kabul Et', btns.style.Success);
    btns.add('foster_reject', '❌ Reddet', btns.style.Danger);
    const row = btns.build();

    const proposalEmbed = sender.classic(
      `📜 <@${parentId}> ve <@${partnerId}> adlı evli çift **${target.username}** adlı kullanıcıyı evlat edinmek istiyor!\n\n` +
      `Sadece <@${target.id}> butonları kullanabilir. 60 saniye içinde cevap ver!`
    );

    const proposalMsg = await message.channel.send({
      embeds: [proposalEmbed],
      components: [row],
      allowedMentions: { users: [target.id, parentId, partnerId] }
    });

    const collector = proposalMsg.createMessageComponentCollector({
      time: 60_000,
    });

    let answered = false;

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== target.id) {
        return interaction.reply({
          content: '❌ Bu butonları sadece evlat edinilecek kişi kullanabilir.',
          ephemeral: true,
        });
      }

      answered = true;
      collector.stop('answered');

      try { await interaction.deferUpdate(); } catch (_) {}

      if (interaction.customId === 'foster_accept') {
        const refreshedParent = await Economy.findOne({ userId: parentId });
        const refreshedPartner = await Economy.findOne({ userId: partnerId }) || new Economy({ userId: partnerId });
        const refreshedTarget = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

        if (!refreshedParent) {
          const fail = sender.errorEmbed('❌ Teklif sahibinin verisi bulunamadı, işlem iptal edildi.');
          return proposalMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        if (!refreshedParent.marriedTo || refreshedParent.marriedTo !== partnerId) {
          const fail = sender.errorEmbed('❌ Kabul edildi ancak çift artık evli değil, işlem iptal edildi.');
          return proposalMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        const stillFoster = await Economy.exists({ fosterlings: target.id });
        if (stillFoster) {
          const fail = sender.errorEmbed(`❌ **${target.username}** bu sırada başka bir aile tarafından evlat edinildi, işlem iptal edildi.`);
          return proposalMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        const stockAfter = refreshedParent.inventory.get(CERTIFICATE_ID) || 0;
        if (stockAfter < 1) {
          const fail = sender.errorEmbed('❌ Kabul edildi ancak Evlat Edinme Belgesi envanterden çıkmış, işlem iptal edildi.');
          return proposalMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        refreshedParent.inventory.set(CERTIFICATE_ID, stockAfter - 1);

        if (!Array.isArray(refreshedParent.fosterlings)) refreshedParent.fosterlings = [];
        if (!refreshedParent.fosterlings.includes(target.id)) refreshedParent.fosterlings.push(target.id);

        if (!Array.isArray(refreshedPartner.fosterlings)) refreshedPartner.fosterlings = [];
        if (!refreshedPartner.fosterlings.includes(target.id)) refreshedPartner.fosterlings.push(target.id);

        await refreshedParent.save();
        await refreshedPartner.save();
        if (refreshedTarget.isNew) await refreshedTarget.save();

        const successEmbed = sender.classic(
          `🎉 Tebrikler! **${target.username}**, artık <@${parentId}> ve <@${partnerId}> çiftinin evladıdır! 👨‍👩‍👧\n` +
          `Evlat Edinme Belgesi kullanıldı.`
        );

        return proposalMsg.edit({ embeds: [successEmbed], components: [] }).catch(() => {});
      }

      if (interaction.customId === 'foster_reject') {
        const rejectedEmbed = sender.classic(
          `💔 **${target.username}**, evlat edinme teklifini reddetti. Evlat Edinme Belgesi iade edildi.`
        );
        return proposalMsg.edit({ embeds: [rejectedEmbed], components: [] }).catch(() => {});
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'answered' || answered) return;
      const timeoutEmbed = sender.errorEmbed(
        `⏰ Evlat edinme teklifi zaman aşımına uğradı. **${target.username}** cevap vermedi. Belge iade edildi.`
      );
      proposalMsg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
    });
  }
};
