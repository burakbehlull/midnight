import ms from 'ms';
import Manager from '#managers';
import { PermissionFlagsBits } from 'discord.js';
import { Punishment } from '#models';
import { Button } from '#helpers';

const vmuteTimeouts = new Map();

export default {
  name: 'vmute',
  description: 'Etiketlenen kullanıcıyı belirli bir süre boyunca ses kanalında susturur.',
  usage: '.vmute @kullanıcı [süre] [sebep]',
  category: 'moderation',

  permissions: {
    authorities: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Administrator],
  },
  
  
  async execute(client, message, args) {
    try {
      const manager = new Manager(client, { action: message });
      const sender = manager.sender;

      if (!args[0]) return sender.reply(sender.errorEmbed("❌ Lütfen bir kullanıcı etiketleyin."), true);

      const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
	  
      if (!target) return sender.reply(sender.errorEmbed("❌ Geçerli bir kullanıcı bulunamadı."), true);
      if (!target.voice.channel) return sender.reply(sender.errorEmbed("❌ Bu kullanıcı bir ses kanalında değil."), true);
      
      const durationArg = args[1];
      const msDuration = durationArg ? ms(durationArg) : null;

      if (msDuration) {
        const reason = args.slice(2).join(' ') || 'Sebep belirtilmedi.';

        if (msDuration < 1000) return sender.reply(sender.errorEmbed("❌ Geçerli bir süre girin. Örn: `10m`, `1h`, `30s`"), true);

        await target.voice.setMute(true, reason);
        
        await Punishment.create({
          userId: target.id,
          guildId: message.guild.id,
          staffId: message.author.id,
          type: "vmute",
          duration: durationArg,
          reason
        });

        const timeoutId = setTimeout(async () => {
          if (target.voice.channel && target.voice.serverMute) {
            await target.voice.setMute(false, "Süre doldu").catch(() => {});
            const IEmbed = sender.classic(`🔊 ${target} kullanıcısının susturulma süresi sona erdi.`);
            message.channel.send({ embeds: [IEmbed] }).catch(() => {});
          }
          vmuteTimeouts.delete(`${message.guild.id}-${target.id}`);
        }, msDuration);

        vmuteTimeouts.set(`${message.guild.id}-${target.id}`, timeoutId);

        return sender.reply(sender.classic(`${target} kullanıcısı **${durationArg}** boyunca ses kanalında susturuldu.\n**Sebep:** ${reason}`), true);
      }

      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';

      const row1 = new Button();
      row1.add(`vmute_1m`, '1 Dakika', row1.style.Primary);
      row1.add(`vmute_10m`, '10 Dakika', row1.style.Primary);
      row1.add(`vmute_30m`, '30 Dakika', row1.style.Primary);

      const row2 = new Button();
      row2.add(`vmute_1h`, '1 Saat', row2.style.Secondary);
      row2.add(`vmute_5h`, '5 Saat', row2.style.Secondary);
      row2.add(`vmute_1d`, '1 Gün', row2.style.Danger);

      const embed = sender.classic(
        `🔇 **${target.user.tag}** kullanıcısı için bir sesli susturma süresi seçin.\n\n**Sebep:** ${reason}`
      );

      const replyMsg = await message.reply({
        embeds: [embed],
        components: [row1.build(), row2.build()]
      });

      const filter = (i) => i.user.id === message.author.id;
      const collector = replyMsg.createMessageComponentCollector({ filter, time: 30000 });

      collector.on('collect', async (i) => {
        let timeString = '';
        if (i.customId === 'vmute_1m') timeString = '1m';
        else if (i.customId === 'vmute_10m') timeString = '10m';
        else if (i.customId === 'vmute_30m') timeString = '30m';
        else if (i.customId === 'vmute_1h') timeString = '1h';
        else if (i.customId === 'vmute_5h') timeString = '5h';
        else if (i.customId === 'vmute_1d') timeString = '1d';

        const selectedMs = ms(timeString);

        try {
          await target.voice.setMute(true, reason);

          await i.update({
            embeds: [sender.classic(`${target} kullanıcısı **${timeString}** boyunca ses kanalında susturuldu.\n**Sebep:** ${reason}`)],
            components: []
          });

          await Punishment.create({
            userId: target.id,
            guildId: message.guild.id,
            staffId: message.author.id,
            type: "vmute",
            duration: timeString,
            reason
          });

          const timeoutId = setTimeout(async () => {
            if (target.voice.channel && target.voice.serverMute) {
              await target.voice.setMute(false, "Süre doldu").catch(() => {});
              const IEmbed = sender.classic(`🔊 ${target} kullanıcısının susturulma süresi sona erdi.`);
              message.channel.send({ embeds: [IEmbed] }).catch(() => {});
            }
            vmuteTimeouts.delete(`${message.guild.id}-${target.id}`);
          }, selectedMs);

          vmuteTimeouts.set(`${message.guild.id}-${target.id}`, timeoutId);

          collector.stop('success');
        } catch (err) {
          console.error('VMute Buton Hatası:', err);
          await i.reply({ content: '❌ Kullanıcı sesli susturulurken bir hata oluştu.', ephemeral: true });
        }
      });

      collector.on('end', (_, reasonCode) => {
        if (reasonCode !== 'success' && replyMsg.editable) {
          replyMsg.edit({ components: [] }).catch(() => {});
        }
      });

    } catch (err) {
      console.error("error: ", err);
      message.reply(sender.errorEmbed("❌ Bir hata oluştu."));
    }
  },
};

export { vmuteTimeouts };
