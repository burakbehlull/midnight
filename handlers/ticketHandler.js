import { ChannelType, PermissionFlagsBits } from "discord.js";

import { messageSender } from "#helpers";
import { Button } from "#helpers";

async function handleTicket(interaction) {
  if (!interaction.isButton()) return;

  const sender = new messageSender(interaction);
  const guild = interaction.guild;
  const member = interaction.member;

  if (interaction.customId === "ticket:create") {
    let category = guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory &&
        channel.name.toLowerCase() === "tickets"
    );

    if (!category) {
      category = await guild.channels.create({
        name: "tickets",
        type: ChannelType.GuildCategory,
      });
    }

    const existing = guild.channels.cache.find(
      (c) =>
        c.name === `ticket-${member.user.username.toLowerCase()}` &&
        c.parentId === category.id
    );
    if (existing) {
      return sender.reply("Zaten bir ticket'iniz açık.", true);
    }

    const channel = await guild.channels.create({
      name: `ticket-${member.user.username.toLowerCase()}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
			id: member.id,
			allow: [
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.SendMessages,
				PermissionFlagsBits.ReadMessageHistory,
			],
        },
        /*
		{
			id: 'DESTEK_ROL_ID',
			allow: [
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.SendMessages,
				PermissionFlagsBits.ReadMessageHistory,
			],
        },
		*/
		
      ],
    });

    const closeButton = new Button();
    closeButton.add("ticket:close", "Kapat", closeButton.style.Danger, "🔒");

    const embed = sender.embed({
      title: "🎫 Ticket Açıldı",
      description: `${member} destek ekibiyle iletişime geçti.\nLütfen sorununu detaylı şekilde yaz.`,
    });

    await channel.send({ embeds: [embed], components: [closeButton.build()] });
    sender.reply(`Ticket oluşturuldu: ${channel}`, true);
  }

  if (interaction.customId === "ticket:close") {
    const channel = interaction.channel;
    if (!channel.name.startsWith("ticket-")) {
      return sender.reply("Bu komut sadece ticket kanallarında çalışır.", true);
    }

    await sender.reply("Ticket kapatılıyor...", true);
    setTimeout(() => channel.delete().catch(console.error), 3000);
  }
}

export default handleTicket;
