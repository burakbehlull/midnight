import { Events } from 'discord.js';
import { afkHandler, levelMessageHandler, statsUtilsHandler, handleCooldown } from "#handlers"
import { Settings } from "#models";
import { checkCommandRestrictions, handleAutoDelete } from "#helpers";
import "dotenv/config"

export default {
  name: Events.MessageCreate, 
  async execute(client, message) {
    let prefix = process.env.PREFIX;

    if (message.guild) {
      try {
        const settings = await Settings.findOne({ guildId: message.guild.id }).select('prefix').lean();
        if (settings && settings.prefix) {
          prefix = settings.prefix;
        }
      } catch (err) {
          console.error('[messageCreate] Prefix okunurken hata:', err);
        }
      }
	
	if(message.author.bot) return
	
	await levelMessageHandler(message.author.id, message.guild?.id, message);
	await statsUtilsHandler.updateMessageStats(message.author.id, message.guild?.id, message.channel.id);
	await afkHandler(message);
	

    if (!prefix || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.prefixCommands.get(commandName);

    if (!command) return;
	
	const restrictionCheck = await checkCommandRestrictions(message, command.name);
	if (!restrictionCheck.allowed) {
	  return message.reply(restrictionCheck.reason);
	}
	
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
      await command.execute(client, message, args);
	  
	  await handleAutoDelete(message, command.name);
    } catch (error) {
      console.error(`❌ Error executing command: ${commandName}`, error);
      message.channel.send('❌ There was an error executing that command.');
    }
  },
};
