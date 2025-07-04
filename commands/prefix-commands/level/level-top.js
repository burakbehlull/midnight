import { EmbedBuilder } from 'discord.js';
import { Level } from '#models';
import { messageSender } from "#helpers";

const formatTopUsers = async (array, fieldName, guild) => {
  const formatted = await Promise.all(array.map(async (data, index) => {
    const user = await guild.members.fetch(data.userId).catch(() => null);
    const username = user ? `${user.user.globalName || user.user.username}` : `Unknown (${data.userId})`;
    return `\` ${index + 1} \` **${username}**: ${data[fieldName]}`;
  }));
  return formatted.join('\n');
};

export default {
  name: "level-top",
  usage: ".level-top <message | voice | streamer | camera>",
  description: "Lider tablosunu gösterir.",
  category: 'level',
  async execute(client, message, args) {
    const { guild } = message;

    const type = args[0]?.toLowerCase();
    const validTypes = ["voice", "message", "streamer", "camera"];
	const sender = new messageSender(message)

	const IEmbed = sender.embed({
		author: { name: message.guild.name, iconURL: message.guild.iconURL()},
		title: "**Sunucu Lider Tablosu**",
		color: 0x5865f2,
	})
    const embed = new EmbedBuilder(IEmbed)

    if (validTypes.includes(type)) {
      let data = [];
      let title = "";
      if (type === "voice") {
        data = await Level.find({ guildId: guild.id }).sort({ voiceXP: -1 }).limit(5);
        title = "En Aktif Ses Kullanıcıları";
        embed.setDescription(await formatTopUsers(data, "voiceXP", guild));
      } else if (type === "message") {
        data = await Level.find({ guildId: guild.id }).sort({ messageXP: -1 }).limit(5);
        title = "En Aktif Mesaj Kullanıcıları";
        embed.setDescription(await formatTopUsers(data, "messageXP", guild));
      } else if (type === "streamer") {
        data = await Level.find({ guildId: guild.id }).sort({ totalStreams: -1 }).limit(5);
        title = "En Çok Yayın Açanlar";
        embed.setDescription(await formatTopUsers(data, "totalStreams", guild));
      } else if (type === "camera") {
        data = await Level.find({ guildId: guild.id }).sort({ totalCameraOpens: -1 }).limit(5);
        title = "En Çok Kamera Açanlar";
        embed.setDescription(await formatTopUsers(data, "totalCameraOpens", guild));
      }

      embed.setTitle(`${title}`);
      return message.channel.send({ embeds: [embed] });
    }

    const [topMessage] = await Level.find({ guildId: guild.id }).sort({ messageXP: -1 }).limit(1);
    const [topVoice] = await Level.find({ guildId: guild.id }).sort({ voiceXP: -1 }).limit(1);
    const [topStreamer] = await Level.find({ guildId: guild.id }).sort({ totalStreams: -1 }).limit(1);
    const [topCamera] = await Level.find({ guildId: guild.id }).sort({ totalCameraOpens: -1 }).limit(1);

    const getUsername = async (id) => {
      const member = await guild.members.fetch(id).catch(() => null);
	return member ? `${member.user.username}` : `Unknown (${id})`;
    };
	
	const descLines = [];

	if (topMessage?.messageXP > 0) {
	  const name = await getUsername(topMessage.userId);
	  if (name) descLines.push(`**Mesaj**:  \`${name}\` / ${topMessage.messageXP} XP`);
	} else {
	  descLines.push(`**Mesaj**:  Veri yok`);
	}

	if (topVoice?.voiceXP > 0) {
	  const name = await getUsername(topVoice.userId);
	  if (name) descLines.push(`**Ses**:  \`${name}\` / ${topVoice.voiceXP} XP`);
	} else {
	  descLines.push(`**Ses**:  Veri yok`);
	}

	if (topStreamer?.totalStreams > 0) {
	  const name = await getUsername(topStreamer.userId);
	  if (name) descLines.push(`**Yayın**:  \`${name}\` / ${topStreamer.totalStreams}`);
	} else {
	  descLines.push(`**Yayın**:  Veri yok`);
	}

	if (topCamera?.totalCameraOpens > 0) {
	  const name = await getUsername(topCamera.userId);
	  if (name) descLines.push(`**Kamera**:  \`${name}\` / ${topCamera.totalCameraOpens}`);
	} else {
	  descLines.push(`**Kamera**:  Veri yok`);
	}

	embed.setDescription(descLines.join('\n'));

    message.channel.send({ embeds: [embed] });
  }
};
