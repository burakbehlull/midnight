import Manager from "#managers";
import { Punishment } from "#models";

export default {
  name: "active-penalties",
  aliases: ['aktifcezalar', 'activecezalar', 'aktif-cezalar', 'aktif'],
  description: 'Belirtilen kullanıcının aktif cezalarını gösterir',
  usage: 'active-penalties @user/userId',
  category: 'staff',

  permissions: {
    enabled: false
  },
  
  async execute(client, message, args) {
    const sender = new Manager(client, { action: message }).sender;

    const mentionedUser = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const isSelf = !args[0] || args[0].toLowerCase() === 'me';
    const targetMember = isSelf ? message.member : mentionedUser;

    if (!targetMember) return sender.reply(sender.errorEmbed("Geçerli bir kullanıcı belirtin!"));

    const userId = targetMember.id;
    const targetUser = targetMember.user ?? targetMember;
    const thumbnailURL = targetUser.displayAvatarURL({ dynamic: true, size: 256 });

    const activePenalties = await Punishment.find({ 
      userId, 
      guildId: message.guild.id,
      active: true,
      deleted: { $ne: true }
    }).sort({ date: -1 });

    const member = await message.guild.members.fetch(userId).catch(() => null);
    
    const activeCezalar = {
      ban: [],
      jail: [],
      timeout: [],
      vmute: [],
      mute: [],
      warn: [],
      manual: []
    };

    for (const penalty of activePenalties) {
      if (penalty.expiresAt && new Date(penalty.expiresAt) < new Date()) {
        penalty.active = false;
        await penalty.save();
        continue;
      }

      if (activeCezalar[penalty.type]) {
        activeCezalar[penalty.type].push(penalty);
      }
    }

    const isBanned = await message.guild.bans.fetch(userId).catch(() => null);
    if (isBanned && activeCezalar.ban.length === 0) {
      activeCezalar.ban.push({
        recordId: null,
        reason: isBanned.reason || 'Discord\'dan banlı',
        date: new Date(),
        duration: 'Kalıcı',
        type: 'ban'
      });
    } else if (!isBanned && activeCezalar.ban.length > 0) {
      for (const ban of activeCezalar.ban) {
        if (ban.save) {
          ban.active = false;
          await ban.save();
        }
      }
      activeCezalar.ban = [];
    }

    if (member && member.communicationDisabledUntilTimestamp) {
      if (member.communicationDisabledUntilTimestamp > Date.now()) {
        const foundTimeout = activeCezalar.timeout.length > 0;
        if (!foundTimeout) {
          activeCezalar.timeout.push({
            recordId: null,
            reason: 'Discord\'dan timeout',
            date: new Date(),
            duration: `${Math.floor((member.communicationDisabledUntilTimestamp - Date.now()) / 60000)} dakika`,
            expiresAt: new Date(member.communicationDisabledUntilTimestamp),
            type: 'timeout'
          });
        }
      }
    } else if (activeCezalar.timeout.length > 0) {
      for (const timeout of activeCezalar.timeout) {
        if (timeout.save) {
          timeout.active = false;
          await timeout.save();
        }
      }
      activeCezalar.timeout = [];
    }

    const totalActive = Object.values(activeCezalar).reduce((sum, arr) => sum + arr.length, 0);

    if (totalActive === 0) {
      return sender.reply(sender.embed({
        title: "Aktif Ceza Yok",
        description: `<@${userId}> kullanıcısının şu anda hiç aktif cezası bulunmuyor.`,
        thumbnail: thumbnailURL,
        color: "Green"
      }));
    }

    const fields = [];

    if (activeCezalar.ban.length > 0) {
      const banText = activeCezalar.ban.map(b => 
        `${b.recordId ? `\`#${b.recordId}\`` : '`Discord\'dan`'} • ${b.reason}\n` +
        `**Tarih:** ${new Date(b.date).toLocaleDateString()}\n` +
        `**Süre:** ${b.duration || 'Kalıcı'}`
      ).join('\n\n');
      fields.push({ 
        name: `🔨 Ban [${activeCezalar.ban.length}]`, 
        value: banText || 'Yok', 
        inline: false 
      });
    }

    if (activeCezalar.jail.length > 0) {
      const jailText = activeCezalar.jail.map(j => 
        `${j.recordId ? `\`#${j.recordId}\`` : '`Discord\'dan`'} • ${j.reason}\n` +
        `**Tarih:** ${new Date(j.date).toLocaleDateString()}\n` +
        `**Süre:** ${j.duration || 'Belirtilmemiş'}` +
        (j.expiresAt ? `\n**Bitiş:** ${new Date(j.expiresAt).toLocaleString()}` : '')
      ).join('\n\n');
      fields.push({ 
        name: `Jail [${activeCezalar.jail.length}]`, 
        value: jailText || 'Yok', 
        inline: false 
      });
    }

    if (activeCezalar.timeout.length > 0) {
      const timeoutText = activeCezalar.timeout.map(t => 
        `${t.recordId ? `\`#${t.recordId}\`` : '`Discord\'dan`'} • ${t.reason}\n` +
        `**Tarih:** ${new Date(t.date).toLocaleDateString()}\n` +
        `**Süre:** ${t.duration || 'Belirtilmemiş'}` +
        (t.expiresAt ? `\n⏰ **Bitiş:** ${new Date(t.expiresAt).toLocaleString()}` : '')
      ).join('\n\n');
      fields.push({ 
        name: `Timeout [${activeCezalar.timeout.length}]`, 
        value: timeoutText || 'Yok', 
        inline: false 
      });
    }

    if (activeCezalar.vmute.length > 0) {
      const vmuteText = activeCezalar.vmute.map(v => 
        `${v.recordId ? `\`#${v.recordId}\`` : '`Discord\'dan`'} • ${v.reason}\n` +
        `**Tarih:** ${new Date(v.date).toLocaleDateString()}\n` +
        `**Süre:** ${v.duration || 'Belirtilmemiş'}` +
        (v.expiresAt ? `\n**Bitiş:** ${new Date(v.expiresAt).toLocaleString()}` : '')
      ).join('\n\n');
      fields.push({ 
        name: `VMute [${activeCezalar.vmute.length}]`, 
        value: vmuteText || 'Yok', 
        inline: false 
      });
    }

    if (activeCezalar.mute.length > 0) {
      const muteText = activeCezalar.mute.map(m => 
        `${m.recordId ? `\`#${m.recordId}\`` : '`Discord\'dan`'} • ${m.reason}\n` +
        `**Tarih:** ${new Date(m.date).toLocaleDateString()}\n` +
        `**Süre:** ${m.duration || 'Belirtilmemiş'}` +
        (m.expiresAt ? `\n**Bitiş:** ${new Date(m.expiresAt).toLocaleString()}` : '')
      ).join('\n\n');
      fields.push({ 
        name: `Mute [${activeCezalar.mute.length}]`, 
        value: muteText || 'Yok', 
        inline: false 
      });
    }

    if (activeCezalar.warn.length > 0) {
      const warnText = activeCezalar.warn.map(w => 
        `${w.recordId ? `\`#${w.recordId}\`` : '`Discord\'dan`'} • ${w.reason}\n` +
        `**Tarih:** ${new Date(w.date).toLocaleDateString()}`
      ).join('\n\n');
      fields.push({ 
        name: `Warn [${activeCezalar.warn.length}]`, 
        value: warnText || 'Yok', 
        inline: false 
      });
    }

    if (activeCezalar.manual.length > 0) {
      const manualText = activeCezalar.manual.map(m => 
        `${m.recordId ? `\`#${m.recordId}\`` : '`Discord\'dan`'} • ${m.reason}\n` +
        `**Tarih:** ${new Date(m.date).toLocaleDateString()}`
      ).join('\n\n');
      fields.push({ 
        name: `Manuel [${activeCezalar.manual.length}]`, 
        value: manualText || 'Yok', 
        inline: false 
      });
    }

    const embed = sender.embed({
      author: { name: message.guild.name, iconURL: message.guild.iconURL() ?? undefined },
      title: "Aktif Cezalar",
      thumbnail: thumbnailURL,
      description: `<@${userId}> kullanıcısının aktif cezaları:\n\n` +
        `**Toplam Aktif Ceza:** ${totalActive}`,
      fields,
      color: 0xff6b6b
    });

    message.channel.send({ embeds: [embed] });
  }
};
