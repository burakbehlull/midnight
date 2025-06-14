import { Events } from 'discord.js';
import { ticketHandler, itirafHandler } from "#handlers"
import { Modal } from "#helpers"


export default {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
	if (interaction.isButton()){ 
		await ticketHandler(interaction);
	}
    await itirafHandler(interaction);
	
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.slashCommands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}`);
      console.error(error);
    }
  }
};
