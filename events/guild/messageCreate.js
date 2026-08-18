import { Events } from 'discord.js';
import { afkHandler, levelMessageHandler, statsUtilsHandler, handleCooldown } from "#handlers"
import { Settings } from "#models";
import { checkCommandRestrictions, handleAutoDelete, normalizePrefixArgs } from "#helpers";
import Manager from "#managers";
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

    const rawArgs = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = rawArgs.shift().toLowerCase();

    const command = client.prefixCommands.get(commandName);

    if (!command) return;

    const manager = new Manager(client, {
      action: message
    });

    const hasPerm = await manager.authority.checkPermissions(command.permissions || {});
    if (!hasPerm) {
      return message.reply('❌ Bu komutu kullanmak için yetkiniz yetersiz!');
    }
	
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
        if (command.type === 'hybrid') {
          const options = await normalizePrefixArgs(message, command, rawArgs);
          await command.execute(client, message, options);
        } else {
          await command.execute(client, message, rawArgs);
        }
      
      await handleAutoDelete(message, command.name);
      } catch (error) {
        console.error(`❌ Error executing command: ${commandName}`, error);
        message.channel.send('❌ There was an error executing that command.');
      }
  },
};
