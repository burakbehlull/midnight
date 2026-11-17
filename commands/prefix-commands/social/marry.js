import { Button } from '#helpers';
import Manager from '#managers';

import { Economy, Shop } from '#models';
import { emoji } from '#data';

const RELATIONSHIP_TYPES = {
  evli: { emoji: '💍', name: 'Evli', color: '#FFD700' },
  sevgili: { emoji: '❤️', name: 'Sevgili', color: '#FF1493' },
  flört: { emoji: '😘', name: 'Flört', color: '#FF69B4' },
  situationship: { emoji: '🤔', name: 'Situationship', color: '#FFA500' },
  fuckbody: { emoji: '🔥', name: 'Fuck Body', color: '#DC143C' },
  lovebody: { emoji: '💗', name: 'Love Body', color: '#FF1493' }
};

export default {
  name: 'marry',
  description: 'Bir kullanıcı ile evlen, ilişki durumunu değiştir ya da ilişki durumunu gör.',
  aliases: ['evlen', 'evli'],
  usage: '.marry [@kullanıcı] [yüzükId] [tür] | .marry change/değiştir [tür]',
  category: 'social',

  permissions: {
    enabled: false
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const authorId = message.author.id;
    const emojis = emoji.default || emoji;

    const authorData = await Economy.findOne({ userId: authorId }) || new Economy({ userId: authorId });

    if (args[0] && (args[0].toLowerCase() === 'change' || args[0].toLowerCase() === 'değiştir')) {
      if (!authorData.marriedTo) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ İlişki durumunu değiştirmek için önce birileriyle ilişkide olmalısın.'));
      }

      const newType = args[1]?.toLowerCase();
      if (!newType || !RELATIONSHIP_TYPES[newType]) {
        const validTypes = Object.keys(RELATIONSHIP_TYPES).join(', ');
        return manager.sender.reply(
          manager.sender.errorEmbed(`❌ Geçerli bir ilişki türü girmelisin.\n\nKullanılabilir türler: ${validTypes}`)
        );
      }

      if (authorData.money < 5000) {
        return manager.sender.reply(
          manager.sender.errorEmbed('❌ İlişki durumunu değiştirmek için 5,000₺ gerekli.')
        );
      }

  
      const partner = await client.users.fetch(authorData.marriedTo).catch(() => null);
      if (!partner) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Partnerın bulunamadı.'));
      }

  
      const typeInfo = RELATIONSHIP_TYPES[newType];
      const btns = new Button();
      btns.add('type_accept', 'Kabul Et', btns.style.Success);
      btns.add('type_reject', 'Reddet', btns.style.Danger);
      const row = btns.build();

      const proposalEmbed = manager.sender.embed({
        title: '💫 İlişki Durumu Değişikliği',
        description:
          `**${message.author.username}**, ilişki durumunuzu **${typeInfo.emoji} ${typeInfo.name}** olarak değiştirmek istiyor!\n\n` +
          `<@${partner.id}> 60 saniye içinde cevap ver!`,
        color: typeInfo.color,
        thumbnail: partner.displayAvatarURL()
      });

      const proposalMsg = await message.channel.send({
        embeds: [proposalEmbed],
        components: [row],
        allowedMentions: { users: [partner.id] }
      });

      const collector = proposalMsg.createMessageComponentCollector({
        time: 60_000,
      });

      let answered = false;

      collector.on('collect', async (interaction) => {
        if (interaction.user.id !== partner.id) {
          return interaction.reply({ 
            content: '❌ Bu butonları sadece partner kullanabilir.', 
            ephemeral: true 
          });
        }

        answered = true;
        collector.stop('answered');

        try {
          await interaction.deferUpdate();
        } catch (_) {}

        if (interaction.customId === 'type_accept') {
          
          const refreshedAuthorData = await Economy.findOne({ userId: authorId });
          const refreshedPartnerData = await Economy.findOne({ userId: partner.id });

          if (refreshedAuthorData.money < 5000) {
            const fail = manager.sender.errorEmbed('❌ Kabul edildi ama yeterli paran kalmamış, işlem iptal edildi.');
            return proposalMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
          }

         
          refreshedAuthorData.money -= 5000;
          refreshedAuthorData.relationshipType = newType;
          refreshedPartnerData.relationshipType = newType;

          await refreshedAuthorData.save();
          await refreshedPartnerData.save();

          const successEmbed = manager.sender.embed({
            title: '✅ İlişki Durumu Değiştirildi!',
            description:
              `**${message.author.username}** ve **${partner.username}** artık **${typeInfo.emoji} ${typeInfo.name}**!\n\n` +
              `💰 5,000₺ ödendi.`,
            color: manager.theme.colors.green,
            thumbnail: partner.displayAvatarURL()
          });

          return proposalMsg.edit({ embeds: [successEmbed], components: [] }).catch(() => {});
        }

        if (interaction.customId === 'type_reject') {
          const rejectedEmbed = manager.sender.classic(
            `💔 **${partner.username}**, ilişki durumu değişikliğini reddetti.`
          );
          return proposalMsg.edit({ embeds: [rejectedEmbed], components: [] }).catch(() => {});
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason === 'answered') return;
        if (answered) return;
        const timeoutEmbed = manager.sender.errorEmbed(
          `⏰ İstek zaman aşımına uğradı. **${partner.username}** cevap vermedi.`
        );
        proposalMsg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
      });

      return;
    }

    
    if (authorData.marriedTo) {
      const partner = await client.users.fetch(authorData.marriedTo).catch(() => null);
      const partnerName = partner ? partner.username : 'Bilinmeyen Kullanıcı';

      const marriedDate = authorData.marriageSince ? new Date(authorData.marriageSince) : new Date();
      const diffTime = Math.abs(new Date() - marriedDate);
      const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const years = Math.floor(totalDays / 365);
      const monthsDuration = Math.floor((totalDays % 365) / 30);
      const days = Math.floor((totalDays % 365) % 30);
      
      const parts = [];
      if (years > 0) parts.push(`${years} yıl`);
      if (monthsDuration > 0) parts.push(`${monthsDuration} ay`);
      if (days > 0) parts.push(`${days} gün`);
      
      const durationText = parts.length > 0 ? parts.join(' ') : '0 gün';

      let ringEmoji = '💍';
      
      if (authorData.marriageRing) {
        const ringItem = await Shop.findOne({ slug: authorData.marriageRing });
        if (ringItem && ringItem.emoji) {
          ringEmoji = ringItem.emoji;
        }
      }

      const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      const day = marriedDate.getDate();
      const month = monthNames[marriedDate.getMonth()];
      const year = marriedDate.getFullYear();
      const formattedDate = `${day} ${month} ${year}`;

    
      const relType = authorData.relationshipType || 'evli';
      const typeInfo = RELATIONSHIP_TYPES[relType] || RELATIONSHIP_TYPES.evli;

      return manager.sender.reply(
        `${typeInfo.emoji} **${partnerName}** ile **${durationText}** **${typeInfo.name}**siniz! ${ringEmoji}\n` +
        `Başlangıç: ${formattedDate}\n\n`
      );
    }

    
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    const ringId = args[1];
    const relationshipType = args[2]?.toLowerCase() || 'evli';

    if (!target) 
      return manager.sender.reply(
        manager.sender.errorEmbed('❌ Evlenmek istediğin kişiyi etiketlemelisin.\n\nKullanım: `.marry @kullanıcı yüzükId [tür]`')
      );

    if (target.id === authorId)
      return manager.sender.reply(manager.sender.errorEmbed('❌ Kendinle evlenemezsin.'));

    if (target.bot)
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bir bot ile evlenemezsin.'));

  
    if (!RELATIONSHIP_TYPES[relationshipType]) {
      const validTypes = Object.keys(RELATIONSHIP_TYPES).join(', ');
      return manager.sender.reply(
        manager.sender.errorEmbed(`❌ Geçersiz ilişki türü. Kullanılabilir türler:\n\n${validTypes}\n\nÖrn: \`.marry @user 1 flört\``)
      );
    }

    const targetData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

    if (targetData.marriedTo) 
      return manager.sender.reply(
        manager.sender.errorEmbed(`❌ **${target.username}** zaten başkasıyla ilişkide.`)
      );

    if (!ringId || isNaN(ringId)) 
      return manager.sender.reply(
        manager.sender.errorEmbed('❌ Geçerli bir yüzük ID girmelisin.\n\nÖrn: `.marry @user 2 evli`')
      );

    const ringItem = await Shop.findOne({ id: parseInt(ringId), module: 'ring' });
    
    if (!ringItem) {
      return manager.sender.reply(
        manager.sender.errorEmbed('❌ Bu ID ile bir yüzük bulunamadı. Yalnızca yüzüklerle evlenebilirsin!')
      );
    }

    const ringSlug = ringItem.slug || `item_${ringItem.id}`;
    const inventoryCount = authorData.inventory.get(ringSlug) || 0;
    
    if (inventoryCount < 1) 
      return manager.sender.reply(
        manager.sender.errorEmbed('❌ Envanterinde bu yüzükten bulunmuyor.')
      );

    const typeInfo = RELATIONSHIP_TYPES[relationshipType];
    const btns = new Button();
    btns.add('marry_accept', 'Kabul Et', btns.style.Success);
    btns.add('marry_reject', 'Reddet', btns.style.Danger);
    const row = btns.build();

    const proposalEmbed = manager.sender.embed({
      title: `${typeInfo.emoji} ${typeInfo.name} Teklifi`,
      description:
        `**${message.author.username}**, **${target.username}** ile **${typeInfo.name}** olmak istiyor!\n\n` +
        `**Yüzük:** ${ringItem.emoji || '💍'} **${ringItem.name}**\n` +
        `**İlişki Türü:** ${typeInfo.emoji} **${typeInfo.name}**\n\n` +
        `<@${target.id}> 60 saniye içinde cevap ver!`,
      color: typeInfo.color,
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
        return interaction.reply({ 
          content: '❌ Bu butonları sadece teklif alan kişi kullanabilir.', 
          ephemeral: true 
        });
      }

      answered = true;
      collector.stop('answered');

      try {
        await interaction.deferUpdate();
      } catch (_) {}

      if (interaction.customId === 'marry_accept') {
        const refreshedAuthorData = await Economy.findOne({ userId: authorId }) || new Economy({ userId: authorId });
        const refreshedTargetData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

        const stock = refreshedAuthorData.inventory.get(ringSlug) || 0;
        if (stock < 1) {
          const fail = manager.sender.errorEmbed('❌ Kabul edildi ama yüzük envanterinden çıkmış, işlem iptal edildi.');
          return proposalMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        if (refreshedAuthorData.marriedTo || refreshedTargetData.marriedTo) {
          const fail = manager.sender.errorEmbed('❌ Kabul edildi ancak biriniz artık ilişkidesiniz, işlem iptal edildi.');
          return proposalMsg.edit({ embeds: [fail], components: [] }).catch(() => {});
        }

        refreshedAuthorData.inventory.set(ringSlug, stock - 1);

        const now = new Date();
        const marriageRingSlug = ringItem?.slug || null;
        
        refreshedAuthorData.marriedTo = target.id;
        refreshedAuthorData.marriageSince = now;
        refreshedAuthorData.marriageRing = marriageRingSlug;
        refreshedAuthorData.relationshipType = relationshipType;
        refreshedAuthorData.familyName = null;

        refreshedTargetData.marriedTo = authorId;
        refreshedTargetData.marriageSince = now;
        refreshedTargetData.marriageRing = marriageRingSlug;
        refreshedTargetData.relationshipType = relationshipType;
        refreshedTargetData.familyName = null;

        await refreshedAuthorData.save();
        await refreshedTargetData.save();

        const successEmbed = manager.sender.embed({
          title: `🎉 ${typeInfo.name} Gerçekleşti!`,
          description:
            `**${message.author.username}** ile **${target.username}** artık **${typeInfo.emoji} ${typeInfo.name}**!\n\n` +
            `**Yüzük:** ${ringItem.emoji || '💍'} **${ringItem.name}**\n` +
            `**İlişki Türü:** ${typeInfo.emoji} **${typeInfo.name}**`,
          color: manager.theme.colors.green,
          thumbnail: target.displayAvatarURL(),
          footer: { 
            text: '❤️ Mutluluklar dileriz! İlişki durumunu değiştirmek için: .marry change [tür]', 
            iconURL: message.author.displayAvatarURL() 
          }
        });

        return proposalMsg.edit({ embeds: [successEmbed], components: [] }).catch(() => {});
      }

      if (interaction.customId === 'marry_reject') {
        const rejectedEmbed = manager.sender.classic(
          `💔 **${target.username}**, teklifi reddetti. Yüzük envantere iade edildi.`
        );
        return proposalMsg.edit({ embeds: [rejectedEmbed], components: [] }).catch(() => {});
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'answered') return;
      if (answered) return;
      const timeoutEmbed = manager.sender.errorEmbed(
        `⏰ Teklif zaman aşımına uğradı. **${target.username}** cevap vermedi.`
      );
      proposalMsg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
    });
  }
};
