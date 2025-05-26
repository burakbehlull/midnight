import { readdirSync } from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { Collection } from 'discord.js';

class Base {
    constructor(client){
		this.client = client
	}
	
	async loadCommands(){
	  const client = this.client
	  
	  client.config = {
			PREFIX: process.env.PREFIX
	  };
	  client.prefixCommands = new Collection();
	  client.slashCommands = new Collection();
	  
	  const filename = fileURLToPath(import.meta.url);
	  const dirname = path.dirname(filename);

	  const prefixCommandsPath = path.join(dirname, '..', 'commands', 'prefix-commands');
	  const slashCommandsPath = path.join(dirname, '..', 'commands', 'slash-commands');

	  const prefixCommandFiles = readdirSync(prefixCommandsPath).filter((file) => file.endsWith('.js'));
	  const slashCommandFiles = readdirSync(slashCommandsPath).filter((file) => file.endsWith('.js'));

	  let prefixCount = 0;
	  let slashCount = 0;
	  let failedCount = 0;
	  let failedCommands = [];

	  for (const file of prefixCommandFiles) {
		const filePath = path.join(prefixCommandsPath, file);
		const fileUrl = pathToFileURL(filePath).href;

		try {
		  const command = await import(fileUrl);

		  const { name, execute } = command.default;

		  if (!name || !execute) {
			console.warn(`⚠️ ${file} command is missing "name" or "execute" property.`);
			failedCount++;
			failedCommands.push(file);
			continue;
		  }

		  client.prefixCommands.set(name, execute);
		  prefixCount++;
		} catch (error) {
		  console.error(`❌ Error loading prefix command from ${file}:`, error);
		  failedCount++;
		  failedCommands.push(file);
		}
	  }

	  for (const file of slashCommandFiles) {
		const filePath = path.join(slashCommandsPath, file);
		const fileUrl = pathToFileURL(filePath).href;

		try {
		  const command = await import(fileUrl);

		  const { data, execute } = command.default;

		  if (!data || !execute) {
			console.warn(`⚠️ ${file} command is missing "data" or "execute" property.`);
			failedCount++;
			failedCommands.push(file);
			continue;
		  }

		  client.slashCommands.set(data.name, execute);
		  slashCount++;
		} catch (error) {
		  console.error(`❌ Error loading slash command from ${file}:`, error);
		  failedCount++;
		  failedCommands.push(file);
		}
	  }

	  console.log(prefixCount
		? `✅ ${prefixCount} prefix command(s) loaded successfully.`
		: '🤔 No prefix command found to load.'
	  );
	  console.log(slashCount
		? `✅ ${slashCount} slash command(s) loaded successfully.`
		: '🤔 No slash command found to load.'
	  );

	  if (failedCount) {
		console.error(`⚠️ Total failed commands: ${failedCount}`);
		console.error(`Failed command files: ${failedCommands.join(', ')}`);
	  }
	}
	
	async loadEvents(){
	  const client = this.client
	  const filename = fileURLToPath(import.meta.url);
	  const dirname = path.dirname(filename);
	  const eventsPath = path.join(dirname, '..', 'events');

	  const eventFiles = readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

	  let loadedCount = 0;
	  let failedCount = 0;
	  let failedEvents = [];

	  for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file);
		const fileUrl = pathToFileURL(filePath).href;

		try {
		  const event = await import(fileUrl);

		  const { name, once, execute } = event.default;

		  if (!name || !execute) {
			console.warn(`⚠️ ${file} event is missing "name" or "execute" property.`);
			failedCount++;
			failedEvents.push(file);
			continue;
		  }

		  if (once) {
			client.once(name, (...args) => execute(client, ...args));
		  } else {
			client.on(name, (...args) => execute(client, ...args));
		  }

		  loadedCount++;
		} catch (error) {
		  console.error(`❌ Error loading event from ${file}:`, error);
		  failedCount++;
		  failedEvents.push(file);
		}
	  }

	  const message = loadedCount 
	  ? `📦 ${loadedCount} event loaded successfully`
	  : 'No event found to load.';

	  console.log(message);
	  
	  if (failedCount) {
		console.error(`⚠️ Total failed events: ${failedCount}`);
		console.error(`Failed event files: ${failedEvents.join(', ')}`);
	  }
	}

	connect(){
		const client = this.client
		client.login(process.env.TOKEN);
	}
}

export default Base