import { Button } from '#helpers';
import Manager from '#managers';

import { Economy, Shop } from '#models';
import { emoji } from '#data';

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
    const emojis = emoji.default || emoji;

    const authorData = await Economy.findOne({ userId: authorId }) || new Economy({ userId: authorId });

    if (authorData.marriedTo) {
      const partner = await client.users.fetch(authorData.marriedTo).catch(() => null);
      const partnerName = partner ? partner.username : 'Bilinmeyen Kullanıcı';

      const marriedDate = authorData.marriageSince ? new Date(authorData.marriageSince) : new Date();
      const diffTime = Math.abs(new Date() - marriedDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let ringEmoji = '💍';
      
      if (authorData.marriageRing) {
        const ringItem = await Shop.findOne({ slug: authorData.marriageRing });
        if (ringItem && ringItem.emoji) {
          ringEmoji = ringItem.emoji;
        }
      }

      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      const day = marriedDate.getDate();
      const month = months[marriedDate.getMonth()];
      const year = marriedDate.getFullYear();
      const formattedDate = `${day} ${month} ${year}`;

      return manager.sender.reply(
        `${ringEmoji} **${partnerName}** ile **${diffDays}** gündür evlisiniz! ${emojis.rings} \nEvlenme Tarihi: ${formattedDate}`
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

    if (!ringId || isNaN(ringId)) 
      return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli bir yüzük ID girmelisin. Örn: `.marry @user 2`'));

    // ID'den yüzük bilgisini çek ve module kontrolü yap
    const ringItem = await Shop.findOne({ id: parseInt(ringId), module: 'ring' });
    
    if (!ringItem) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bu ID ile bir yüzük bulunamadı. Yalnızca yüzüklerle evlenebilirsin!'));
    }

    const ringSlug = ringItem.slug || `item_${ringItem.id}`;
    const inventoryCount = authorData.inventory.get(ringSlug) || 0;
    
    if (inventoryCount < 1) 
      return manager.sender.reply(manager.sender.errorEmbed('❌ Envanterinde bu yüzükten bulunmuyor.'));

    const btns = new Button();
    btns.add('marry_accept', '✅ Kabul Et', btns.style.Success);
    btns.add('marry_reject', '❌ Reddet',  btns.style.Danger);
    const row = btns.build();

    const proposalEmbed = manager.sender.embed({
      title: '💍 Evlilik Teklifi',
      description: 
        `**${message.author.username}**, **${target.username}** ile evlenmek istiyor!\n\n` +
        `**Yüzük:** ${ringItem.emoji || '💍'} **${ringItem.name}**\n\n` +
        `<@${target.id}> 60 saniye içinde cevap ver!`,
      color: manager.theme.colors.pink,
      thumbnail: target.displayAvatarURL()
    });

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

        // Slug ile kontrol
        const stock = refreshedAuthorData.inventory.get(ringSlug) || 0;
        if (stock < 1) {
          const fail = manager.sender.errorEmbed('❌ Kabul edildi ama yüzük envanterinden çıkmış, işlem iptal edildi.');
          return proposalMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        if (refreshedAuthorData.marriedTo || refreshedTargetData.marriedTo) {
          const fail = manager.sender.errorEmbed('❌ Kabul edildi ancak biriniz artık evlisiniz, işlem iptal edildi.');
          return proposalMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        // Slug ile yüzüğü azalt
        refreshedAuthorData.inventory.set(ringSlug, stock - 1);

        const now = new Date();
        const marriageRingSlug = ringItem?.slug || null;
        
        refreshedAuthorData.marriedTo = target.id;
        refreshedAuthorData.marriageSince = now;
        refreshedAuthorData.marriageRing = marriageRingSlug;

        refreshedTargetData.marriedTo = authorId;
        refreshedTargetData.marriageSince = now;
        refreshedTargetData.marriageRing = marriageRingSlug;

        await refreshedAuthorData.save();
        await refreshedTargetData.save();

        const successEmbed = manager.sender.embed({
          title: '🎉 Evlilik Gerçekleşti!',
          description: 
            `**${message.author.username}** ile **${target.username}** artık evli!\n\n` +
            `**Evlilik Yüzüğü:** ${ringItem.emoji || '💍'} **${ringItem.name}**`,
          color: manager.theme.colors.green,
          thumbnail: target.displayAvatarURL(),
          footer: { text: '❤️ Mutluluklar dileriz!', iconURL: message.author.displayAvatarURL() }
        });

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
