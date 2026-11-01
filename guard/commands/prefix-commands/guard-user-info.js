import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { GuardLogs } from '#models';
import { guardHelpers } from '#helpers';

const ACTION_NAMES = {
  ban: 'Ban',
  kick: 'Kick',
  roleAssign: 'Rol Verme',
  roleCreate: 'Rol Oluşturma',
  roleDelete: 'Rol Silme',
  roleUpdate: 'Rol Güncelleme',
  channelCreate: 'Kanal Oluşturma',
  channelDelete: 'Kanal Silme',
  channelUpdate: 'Kanal Güncelleme'
};

export default {
  name: 'guard-user-info',
  aliases: ['gui', 'guardinfo'],
  description: 'Bir kullanıcının guard profilini, whitelist durumunu ve limitlerini gösterir',
  usage: 'guard-user-info [@kullanıcı|ID]',
  permissions: {
    authorities: [PermissionFlagsBits.Administrator],
    user: [],
    roles: []
  },

  async execute(client, message, args = []) {
    try {
      const guild = message.guild;
      const requester = message.member;

      if (!client.permissionsManager || !client.guardManager) {
        return await message.reply('❌ Guard sistemi henüz yüklenmedi!');
      }

      const targetInput = args[0] ?? requester.id;
      const targetId = targetInput.replace(/[<@!>]/g, '');

      if (!/^\d{17,20}$/.test(targetId)) {
        return await message.reply('❌ Kullanım: `guard-user-info <@kullanıcı|ID>`');
      }

      const member = await guild.members.fetch(targetId).catch(() => null);
      const user = member?.user ?? (await client.users.fetch(targetId).catch(() => null));

      if (!user) {
        return await message.reply('❌ Kullanıcı bulunamadı!');
      }

      const settings = await client.permissionsManager.getGuildSettings(guild.id);
      const exemption = await client.permissionsManager.getExemptionStatus(guild.id, targetId, member);
      const limitData = await client.guardManager.getLimitStatus(guild.id, targetId);
      const limitStatus = limitData.specific;
      const globalStatus = limitData.global;

      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const executorQuery = { guildId: guild.id, 'executor.id': targetId };

      const [totalLogs, recentLogs, punishedLogs, lastLog, byType] = await Promise.all([
        GuardLogs.countDocuments(executorQuery),
        GuardLogs.countDocuments({ ...executorQuery, timestamp: { $gte: last24h } }),
        GuardLogs.countDocuments({ ...executorQuery, 'punishments.0': { $exists: true } }),
        GuardLogs.findOne(executorQuery).sort({ timestamp: -1 }).lean(),
        GuardLogs.aggregate([
          { $match: executorQuery },
          { $group: { _id: '$eventType', count: { $sum: 1 } } }
        ])
      ]);

      const profileLines = [
        `**Etiket:** ${user.tag}`,
        `**ID:** \`${user.id}\``,
        `**Hesap:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`
      ];
      if (member?.joinedTimestamp) {
        profileLines.push(`**Sunucuya katılma:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`);
        profileLines.push(`**Rol sayısı:** ${member.roles.cache.size - 1}`);
      } else {
        profileLines.push('**Durum:** ⚠️ Sunucuda değil (profil kısıtlı)');
      }
      if (user.bot) profileLines.push('**Tip:** 🤖 Bot');

      const whitelistLines = [
        `${exemption.isExempt ? '✅ **MUAF** (guard işlem yapmaz)' : '❌ **Muaf değil** (guard işlem yapar)'}`,
        `Sunucu Sahibi: ${exemption.isServerOwner ? '✅' : '❌'}`,
        `Bot Sahibi: ${exemption.isBotOwner ? '✅' : '❌'}`,
        `Güvenli Kullanıcı: ${exemption.inSafeUsers ? '✅' : '❌'}`
      ];
      if (exemption.safeRoles.length > 0) {
        const roles = exemption.safeRoles.slice(0, 5).map(r => `<@&${r.id}>`).join(', ');
        const extra = exemption.safeRoles.length > 5 ? ` +${exemption.safeRoles.length - 5}` : '';
        whitelistLines.push(`Güvenli Rol: ✅ ${roles}${extra}`);
      } else {
        whitelistLines.push('Güvenli Rol: ❌');
      }
      if (member && settings.safeguard.whitelistBots.includes(targetId)) {
        whitelistLines.push('Whitelist Bot: ✅');
      }

      const typeLines = byType
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(t => `${guardHelpers.formatGuardType(t._id)}: **${t.count}**`);

      const recordLines = [
        `Toplam olay (sorumlu): **${totalLogs}**`,
        `Son 24 saat: **${recentLogs}**`,
        `Ceza uygulanan: **${punishedLogs}**`
      ];
      if (lastLog) {
        recordLines.push(`Son olay: ${guardHelpers.formatGuardType(lastLog.eventType)} — <t:${Math.floor(lastLog.timestamp.getTime() / 1000)}:R>`);
      }
      if (typeLines.length > 0) recordLines.push('', ...typeLines);

      const limitLines = limitStatus.map((s) => {
        const name = ACTION_NAMES[s.action] ?? s.action;
        if (s.max === 0) {
          return `${name}: ⛔ **0 izinli (limit yok)** — son 10dk: ${s.current}`;
        }
        const status = s.exceeded ? '⛔ **LİMİT AŞILDI**' : '✅';
        return `${name}: ${guardHelpers.formatLimitStatus(s.current, s.max)} ${status}`;
      });

      const globalLine = `**Genel Limit (10dk):** ${guardHelpers.formatLimitStatus(globalStatus.current, globalStatus.max)} ${globalStatus.exceeded ? '⛔ **AŞILDI**' : '✅'}`;

      const limitValue = exemption.isExempt
        ? `♾️ **Whitelist: limit uygulanmaz** (sayaçlar bilgi amaçlı)\n${globalLine}\n${limitLines.join('\n')}`
        : `${globalLine}\n${limitLines.join('\n') || 'Limit tanımlı değil'}`;

      const embed = new EmbedBuilder()
        .setColor(exemption.isExempt ? '#00ff00' : '#ff9900')
        .setTitle('Guard Kullanıcı Bilgisi')
        .setDescription(`${user} kullanıcısının guard profili`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: 'Profil', value: profileLines.join('\n'), inline: true },
          { name: 'Whitelist Durumu', value: whitelistLines.join('\n'), inline: true },
          { name: 'Guard Kayıtları', value: recordLines.join('\n'), inline: false },
          { name: 'Limit Durumu', value: limitValue, inline: false }
        )
        .setTimestamp()
        .setFooter({
          text: `Sorgulayan: ${requester.user.tag}`,
          iconURL: requester.user.displayAvatarURL()
        });

      return await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Guard user info komutu hatası:', error);
      await message.reply('❌ Bir hata oluştu!').catch(() => {});
    }
  }
};
