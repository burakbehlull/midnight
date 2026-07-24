import { Collection, REST, Routes } from 'discord.js';

import path from "path";
import { fileURLToPath } from "url";

import { getFilesRecursively } from './operations.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getPrefixCommands() {
  const prefixCommands = []
  const commandsPath = path.join(__dirname, "../commands/prefix-commands");
  const commandFiles = await getFilesRecursively(commandsPath);

  for (const filePath of commandFiles) {
    const command = (await import(`file://${filePath}`)).default;
    if (!command?.name) continue;

    prefixCommands.push({...command, type: 'prefix'});
    // console.log(`📢 Prefix komutu yüklendi: ${command.name}`);
  }
  console.log(`📢 ${prefixCommands.length} tane Prefix komutu yüklendi`);

  return prefixCommands
}

async function getSlashCommands() {
  const slashCommands = []
  const commandsPath = path.join(__dirname, "../commands/slash-commands");
  const commandFiles = await getFilesRecursively(commandsPath);

  for (const filePath of commandFiles) {
    const command = (await import(`file://${filePath}`)).default;
    if (!command?.data) continue;

	  slashCommands.push({...command, name: command.data.name, type: 'slash'});
    // console.log(`⚡ Slash komutu yüklendi: ${command.data.name}`);
  }
  console.log(`⚡ ${slashCommands.length} tane Slash komutu yüklendi`);

  return slashCommands
}

async function getEvents() {
  const events = [];
  const eventsPath = path.join(__dirname, "../events");
  const eventFiles = await getFilesRecursively(eventsPath);
  
  for (const filePath of eventFiles) {
    const event = (await import(`file://${filePath}`)).default;

    if (!event?.name) continue;
    //console.log(`🎯 Event yüklendi: ${event.name}`);
    events.push(event);
  }
  console.log(`🎯 ${events.length} tane Event yüklendi.`);

  return events;
}

async function deploySlashCommands(token, botId, commands) {
  const slashCommands = []
  for (const c of commands) {
    slashCommands.push(c.data.toJSON())
  }


  const rest = new REST().setToken(token);
    try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationCommands(botId),
      { body: slashCommands },
    );

      console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
      return {
        success: true,
        message: "Successfully reloaded ${data.length} application (/) commands.",
        count: data.length || 0
      }
    } catch (error) {
      console.error('❌ Failed to refresh commands:', error);
      return {
        success: false,
        message: 'Failed to refresh commands:', error
      }
    }
}

async function eventExecuter(client, events){
	for (const event of events) {
		if (event.once) {
		    client.once(event.name, async (...args) => event.execute(client, ...args));
		} else {
		    client.on(event.name, async (...args) => event.execute(client, ...args));
		}
	}
}

async function commandExecuter(client, slashCommands, prefixCommands){
	
	client.prefixCommands = new Collection();
	client.slashCommands = new Collection();
	
	if(prefixCommands.length > 0){
		for (const pc of prefixCommands) {
			client.prefixCommands.set(pc.name, pc.execute);
		}	
	}
	
	if(slashCommands.length > 0){
		for (const sc of slashCommands) {
			client.slashCommands.set(sc.name, sc.execute);
		}
	}
}

export {
    getPrefixCommands,
    getSlashCommands,
    getEvents,
	
    eventExecuter,
    commandExecuter,
    
    deploySlashCommands
}