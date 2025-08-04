import { Level, Settings } from "#models";
import { misc } from "#helpers";
import { EmbedBuilder } from "discord.js";



export default async function levelMessageHandler(userId, guildId, message) {
  if (message.author.bot) return;
  
  const guild = message.guild;
  if (!guild) return;

  const settings = await Settings.findOne({ guildId: guild.id });
  if (!settings || !settings.levelSystemStatus) return;  

  const user = await Level.findOneAndUpdate(
    { userId, guildId },
    { $inc: { messageXP: 5 } },
    { upsert: true, new: true }
  );

  const newLevel = misc.calculateLevel(user.messageXP);
  if (newLevel > user.messageLevel) {
    user.messageLevel = newLevel;
    await user.save();

    const embed = new EmbedBuilder()
      .setTitle("Seviye Atladın!")
      .setDescription(`🎉 Tebrikler ${message.author}, **${newLevel}. seviye**ye ulaştın!`)
      .setColor("Green")
      .setThumbnail(message.author.displayAvatarURL());

    message.channel.send({ embeds: [embed] });
  }
}
