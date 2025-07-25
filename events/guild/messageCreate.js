import { Events } from 'discord.js';
import { afkHandler, levelMessageHandler, statsUtilsHandler, handleCooldown } from "#handlers"
import "dotenv/config"

export default {
  name: Events.MessageCreate, 
  async execute(client, message) {
    const prefix = process.env.PREFIX
	
	if(message.author.bot) return
	
	await levelMessageHandler(message.author.id, message.guild.id, message);
	await statsUtilsHandler.updateMessageStats(message.author.id, message.guild.id, message.channel.id);
	await afkHandler(message);
	

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.prefixCommands.get(commandName);

    if (!command) return;
	
	// cooldown
	const passed = await handleCooldown({
      userId: message.author.id,
      commandName: command.name,
      cooldownInSeconds: command.cooldown ?? 3,
      client,
      context: message,
      send: (embed) => message.reply({ embeds: [embed] }),
    });

    if (!passed) return;

    try {
      await command(client, message, args);
    } catch (error) {
      console.error(`❌ Error executing command: ${commandName}`, error);
      message.channel.send('❌ There was an error executing that command.');
    }
  },
};
