import Manager from '#managers';
import { Punishment } from '#models';
import { PermissionFlagsBits } from 'discord.js';
import { Button } from '#helpers';
import ms from 'ms';

// Aktif mute timeout'larını saklamak için
const muteTimeouts = new Map();

export default {
  name: 'mute',
  description: 'Kullanıcıyı susturur.',
  usage: '.mute @kullanıcı [süre] [sebep]',
  aliases: ["sustur"],
  category: 'moderation',

  permissions: {
    authorities: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Administrator],
  },
  
  
  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const sender = manager.sender;

    if (!args[0]) return sender.reply(sender.errorEmbed('❌ Susturmak için bir kullanıcı etiketlemelisin.'));

    const member = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!member) return sender.reply(sender.errorEmbed('❌ Geçerli bir kullanıcı bulunamadı.'));

    let mutedRole = message.guild.roles.cache.find(r => r.name === 'Muted');
    
    if (!mutedRole) {
      try {
        mutedRole = await message.guild.roles.create({
          name: 'Muted',
          color: '#555555',
          permissions: []
        });

        message.guild.channels.cache.forEach(async (channel) => {
          await channel.permissionOverwrites.create(mutedRole, {
            SendMessages: false,
            AddReactions: false,
            Speak: false
          });
        });
      } catch (err) {
        console.error(err);
        return sender.reply(sender.errorEmbed('❌ Muted rolü oluşturulamadı.'));
      }
    }

    if (member.roles.cache.has(mutedRole.id)) return sender.reply(sender.errorEmbed('❌ Bu kullanıcı zaten susturulmuş.'));
    
    const durationArg = args[1];
    const msDuration = durationArg ? ms(durationArg) : null;
    
    if (msDuration) {
      const reason = args.slice(2).join(' ') || 'Sebep belirtilmedi.';
      
      try {
        await member.roles.add(mutedRole);
        
        await Punishment.create({
          userId: member.id,
          guildId: message.guild.id,
          staffId: message.author.id,
          type: "mute",
          duration: durationArg,
          reason
        });
        
        // Süre sonunda unmute (setTimeout)
        const timeoutId = setTimeout(async () => {
          if (member.roles.cache.has(mutedRole.id)) {
            await member.roles.remove(mutedRole).catch(() => {});
          }
          muteTimeouts.delete(`${message.guild.id}-${member.id}`);
        }, msDuration);
        
        // Timeout'u sakla
        muteTimeouts.set(`${message.guild.id}-${member.id}`, timeoutId);
        
        return sender.reply(sender.classic(`<@${member.id}> kullanıcısı **${durationArg}** boyunca susturuldu.\n**Sebep:** ${reason}`));
      } catch (err) {
        console.error(err);
        return sender.reply(sender.errorEmbed('❌ Kullanıcı susturulurken hata oluştu.'));
      }
    }
    
    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';

    const row1 = new Button();
    row1.add(`mute_1m`, '1 Dakika', row1.style.Primary);
    row1.add(`mute_10m`, '10 Dakika', row1.style.Primary);
    row1.add(`mute_30m`, '30 Dakika', row1.style.Primary);

    const row2 = new Button();
    row2.add(`mute_1h`, '1 Saat', row2.style.Secondary);
    row2.add(`mute_5h`, '5 Saat', row2.style.Secondary);
    row2.add(`mute_1d`, '1 Gün', row2.style.Danger);

    const embed = sender.classic(
      `🔇 **${member.user.tag}** kullanıcısı için bir susturma süresi seçin.\n\n**Sebep:** ${reason}`
    );

    const replyMsg = await message.reply({
      embeds: [embed],
      components: [row1.build(), row2.build()]
    });

    const filter = (i) => i.user.id === message.author.id;
    const collector = replyMsg.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async (i) => {
      let timeString = '';
      if (i.customId === 'mute_1m') timeString = '1m';
      else if (i.customId === 'mute_10m') timeString = '10m';
      else if (i.customId === 'mute_30m') timeString = '30m';
      else if (i.customId === 'mute_1h') timeString = '1h';
      else if (i.customId === 'mute_5h') timeString = '5h';
      else if (i.customId === 'mute_1d') timeString = '1d';

      const selectedMs = ms(timeString);

      try {
        await member.roles.add(mutedRole);

        await i.update({
          embeds: [sender.classic(`<@${member.id}> kullanıcısı **${timeString}** boyunca susturuldu.\n**Sebep:** ${reason}`)],
          components: []
        });

        await Punishment.create({
          userId: member.id,
          guildId: message.guild.id,
          staffId: message.author.id,
          type: "mute",
          duration: timeString,
          reason
        });
        
        // Süre sonunda unmute
        const timeoutId = setTimeout(async () => {
          if (member.roles.cache.has(mutedRole.id)) {
            await member.roles.remove(mutedRole).catch(() => {});
          }
          muteTimeouts.delete(`${message.guild.id}-${member.id}`);
        }, selectedMs);
        
        // Timeout'u sakla
        muteTimeouts.set(`${message.guild.id}-${member.id}`, timeoutId);
        
        collector.stop('success');
      } catch (err) {
        console.error('Mute Buton Hatası:', err);
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

// Export muteTimeouts for unmute.js to access
export { muteTimeouts };
