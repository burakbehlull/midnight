import { Events } from 'discord.js';
import { afkHandler, levelMessageHandler } from "#handlers"
import "dotenv/config"

export default {
  name: Events.MessageCreate, 
  async execute(client, message) {
    const prefix = process.env.PREFIX
	await levelMessageHandler(message.author.id, message.guild.id, message);

	await afkHandler(message);
	

    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.prefixCommands.get(commandName);

    if (!command) return;

    try {
      await command(client, message, args);
    } catch (error) {
      console.error(`❌ Error executing command: ${commandName}`, error);
      message.channel.send('❌ There was an error executing that command.');
    }
  },
};
