import Manager from "#managers";
import { Punishment } from "#models";
import { PermissionFlagsBits } from "discord.js";

export default {
  name: "sicil",
  aliases: ['record', 'penals'],
  description: 'Belirtilen kullanıcının sicilini gösterir',
  usage: 'sicil me/@user',
  category: 'moderation',

  permissions: {
    authorities: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Administrator],
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

    const data = await Punishment.find({ userId, guildId: message.guild.id });

	  if (!data.length) return sender.reply(sender.errorEmbed("Kaydın yok."));
		
    const warns = data.filter(d => d.type === 'warn');
    const jails = data.filter(d => d.type === 'jail');
    const manuals = data.filter(d => d.type === 'manual');

    const ban = data.filter(d => d.type === 'ban');
    const kick = data.filter(d => d.type === 'kick');
    const timeouts = data.filter(d => d.type === 'timeout');
    const vmute = data.filter(d => d.type === 'vmute');
    const mute = data.filter(d => d.type === 'mute');

    const manualsText = manuals.length
      ? manuals.map(m => `• ${m.reason} (${new Date(m.date).toLocaleDateString()})`).join("\n")
      : "Yok";
    const warnsText = warns.length
      ? warns.map(w => `• ${w.reason} (${new Date(w.date).toLocaleDateString()})`).join("\n")
      : "Yok";
    const jailsText = jails.length
      ? jails.map(j => `• ${j.reason} (${new Date(j.date).toLocaleDateString()}) - ${j.duration}`).join("\n")
      : "Yok";

    const timeoutsText = timeouts.length
      ? timeouts.map(t => `• ${t.reason} (${new Date(t.date).toLocaleDateString()}) - ${t.duration || ' '}`).join("\n")
      : "Yok";

    const banText = ban.length
      ? ban.map(b => `• ${b.reason} (${new Date(b.date).toLocaleDateString()})`).join("\n")
      : "Yok";

    const kickText = kick.length
      ? kick.map(k => `• ${k.reason} (${new Date(k.date).toLocaleDateString()})`).join("\n")
      : "Yok";

    const vmuteText = vmute.length
      ? vmute.map(v => `• ${v.reason} (${new Date(v.date).toLocaleDateString()}) - ${v.duration || ' '}`).join("\n")
      : "Yok";
    
    const muteText = mute.length
      ? mute.map(m => `• ${m.reason} (${new Date(m.date).toLocaleDateString()}) - ${m.duration || ' '}`).join("\n")
      : "Yok";

    const embed = sender.embed({
	    author: { name: message.guild.name, iconURL: message.guild.iconURL() ?? undefined },
      title: "Kullanıcı Sicili",
      thumbnail: thumbnailURL,
      description: `<@${userId}> kullanıcısının ceza geçmişi:`,
      fields: [
        { name: `Genel Cezalar [${manuals.length}]`, value: manualsText, inline: true },
        { name: `Uyarılar [${warns.length}]`, value: warnsText, inline: true },
        { name: `Jail Cezaları [${jails.length}]`, value: jailsText, inline: true },
        { name: `Timeout Cezaları [${timeouts.length}]`, value: timeoutsText, inline: true },
        { name: `Ban Cezaları [${ban.length}]`, value: banText, inline: true },
        { name: `Kick Cezaları [${kick.length}]`, value: kickText, inline: true },
        { name: `VMute Cezaları [${vmute.length}]`, value: vmuteText, inline: true },
        { name: `Mute Cezaları [${mute.length}]`, value: muteText, inline: true }
      ],
      color: 0xe74c3c
    });

    message.channel.send({ embeds: [embed] });
  }
};
