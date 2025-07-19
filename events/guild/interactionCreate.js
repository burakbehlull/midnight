import { Events } from 'discord.js';
import { ticketHandler, itirafHandler, handleCooldown, handleInteractionCreate } from "#handlers"
import { Modal } from "#helpers"


export default {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
	if (interaction.isButton()){ 
		await ticketHandler(interaction);
	}
    await itirafHandler(interaction);
	await handleInteractionCreate(interaction)
	
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.slashCommands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }
	
	const passed = await handleCooldown({
      userId: interaction.user.id,
      commandName: command.name,
      cooldownInSeconds: command.cooldown ?? 3,
      client,
      context: interaction,
      send: (embed) =>
        interaction.channel.send({
          embeds: [embed],
          ephemeral: true,
        }),
    });

    if (!passed) return;

    try {
      await command(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}`);
      console.error(error);
    }
  }
};
