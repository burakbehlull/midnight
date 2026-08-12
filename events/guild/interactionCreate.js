import { Events, MessageFlags } from 'discord.js';
import { ticketHandler, itirafHandler, handleCooldown, handleInteractionCreate } from "#handlers"
import { Modal, checkCommandRestrictions, handleAutoDelete } from "#helpers"
import { PermissionsManager } from "#managers";


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

    const permManager = new PermissionsManager(interaction);
    const hasPerm = await permManager.checkPermissions(command.permissions || {});
    if (!hasPerm) {
      return interaction.reply({
        content: '❌ Bu komutu kullanmak için yetkiniz yetersiz!',
        flags: MessageFlags.Ephemeral
      });
    }
	
    const restrictionCheck = await checkCommandRestrictions(interaction, command.name);
    if (!restrictionCheck.allowed) {
      if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({ content: restrictionCheck.reason, flags: MessageFlags.Ephemeral }).catch(() => {});
      } else {
      return interaction.followUp({ content: restrictionCheck.reason, flags: MessageFlags.Ephemeral }).catch(() => {});
      }
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
            flags: MessageFlags.Ephemeral,
          }),
      });

      if (!passed) return;

      try {
        await command.execute(client, interaction);
      
      await handleAutoDelete(interaction, command.name);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}`);
        console.error(error);
      }
  }
};
