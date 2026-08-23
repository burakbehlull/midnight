import ms from 'ms';
import { PermissionFlagsBits } from 'discord.js';
import { Punishment } from "#models";
import Manager from '#managers';
import { Button } from '#helpers';

export default {
  name: 'timeout',
  aliases: ['sustur', 'to'],
  description: 'Belirtilen kullanıcıyı süreli olarak susturur (timeout).',
  usage: 'timeout <@kullanıcı|ID> [süre] [sebep]',
  category: 'moderation',

  permissions: {
      authorities: [PermissionFlagsBits.ModerateMembers],
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });

    const targetArg = args[0];
    if (!targetArg) return manager.sender.reply(manager.sender.errorEmbed('❌ Lütfen bir kullanıcı etiketleyin veya ID girin.'));

    let member = message.mentions.members.first();
    if (!member) {
      member = await message.guild.members.fetch(targetArg).catch(() => null);
    }

    if (!member) return manager.sender.reply(manager.sender.errorEmbed('❌ Geçerli bir kullanıcı bulunamadı.'));
    if (!member.moderatable) return manager.sender.reply(manager.sender.errorEmbed('❌ Bu kullanıcıya timeout uygulanamıyor (Yetkisi yüksek veya yetkim yetersiz).'));

    const durationArg = args[1];
    const msDuration = durationArg ? ms(durationArg) : null;

    if (msDuration) {
      const reason = args.slice(2).join(' ') || 'Sebep belirtilmedi.';
      try {
        await member.timeout(msDuration, reason);
        return manager.sender.reply(manager.sender.classic(`${member} kullanıcısı **${durationArg}** boyunca susturuldu.\n**Sebep:** ${reason}`));
      } catch (err) {
        console.error('Timeout hatası:', err);
        return manager.sender.reply(manager.sender.errorEmbed('❌ Kullanıcı susturulurken bir hata oluştu.'));
      }
    }

    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';

    const row1 = new Button();
    row1.add(`to_1m`, '1 Dakika', row1.style.Primary);
    row1.add(`to_10m`, '10 Dakika', row1.style.Primary);
    row1.add(`to_30m`, '30 Dakika', row1.style.Primary);

    const row2 = new Button();
    row2.add(`to_1h`, '1 Saat', row2.style.Secondary);
    row2.add(`to_5h`, '5 Saat', row2.style.Secondary);
    row2.add(`to_1d`, '1 Gün', row2.style.Danger);

    const embed = manager.sender.classic(
      `⏱️ **${member.user.tag}** kullanıcısı için bir susturma süresi seçin.\n\n**Sebep:** ${reason}`
    );

    const replyMsg = await message.reply({
      embeds: [embed],
      components: [row1.build(), row2.build()]
    });

    const filter = (i) => i.user.id === message.author.id;
    const collector = replyMsg.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async (i) => {
      let timeString = '';
      if (i.customId === 'to_1m') timeString = '1m';
      else if (i.customId === 'to_10m') timeString = '10m';
      else if (i.customId === 'to_30m') timeString = '30m';
      else if (i.customId === 'to_1h') timeString = '1h';
      else if (i.customId === 'to_5h') timeString = '5h';
      else if (i.customId === 'to_1d') timeString = '1d';

      const selectedMs = ms(timeString);

      try {
        await member.timeout(selectedMs, reason);

        await i.update({
          embeds: [manager.sender.classic(`${member} kullanıcısı **${timeString}** boyunca susturuldu.\n**Sebep:** ${reason}`)],
          components: []
        });

        await Punishment.create({
          userId: member.id,
          guildId: message.guild.id,
          staffId: message.author.id,
          type: "timeout",
          duration: timeString,
          reason
        });
        
        collector.stop('success');
      } catch (err) {
        console.error('Timeout Buton Hatası:', err);
        await i.reply({ content: '❌ Kullanıcı susturulurken bir hata oluştu.', ephemeral: true });
      }
    });

    collector.on('end', (_, reasonCode) => {
      if (reasonCode !== 'success' && replyMsg.editable) {
        replyMsg.edit({ components: [] }).catch(() => {});
      }
    });
  }
};