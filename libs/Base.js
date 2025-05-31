import { readdirSync, statSync  } from 'fs';
import path, { dirname as pathDirname} from 'path';
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
	
	async loadEvents() {
	  const client = this.client;
	  const filename = fileURLToPath(import.meta.url);
	  const dirname = pathDirname(filename);
	  const eventsPath = path.join(dirname, '..', 'events');

	  function getAllEventFiles(dir) {
		let results = [];
		const list = readdirSync(dir);

		for (const file of list) {
		  const filePath = path.join(dir, file);
		  const stat = statSync(filePath);

		  if (stat && stat.isDirectory()) {
			results = results.concat(getAllEventFiles(filePath)); // Recursive call
		  } else if (file.endsWith('.js')) {
			results.push(filePath);
		  }
		}

		return results;
	  }

	  const eventFiles = getAllEventFiles(eventsPath);

	  let loadedCount = 0;
	  let failedCount = 0;
	  let failedEvents = [];

	  for (const filePath of eventFiles) {
		const fileUrl = pathToFileURL(filePath).href;

		try {
		  const event = await import(fileUrl);
		  const { name, once, execute } = event.default;

		  if (!name || !execute) {
			console.warn(`⚠️ ${filePath} event is missing "name" or "execute" property.`);
			failedCount++;
			failedEvents.push(filePath);
			continue;
		  }

		  if (once) {
			client.once(name, (...args) => execute(client, ...args));
		  } else {
			client.on(name, (...args) => execute(client, ...args));
		  }

		  loadedCount++;
		} catch (error) {
		  console.error(`❌ Error loading event from ${filePath}:`, error);
		  failedCount++;
		  failedEvents.push(filePath);
		}
	  }

	  const message = loadedCount 
		? `📦 ${loadedCount} event(s) loaded successfully`
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