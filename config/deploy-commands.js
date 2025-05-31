import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'url';

import 'dotenv/config';
const { BOT_ID, TOKEN } = process.env;

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const commandsPath = path.join(dirname, '..', 'commands', 'slash-commands');

const commands = [];

function getAllJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getAllJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

const commandFiles = getAllJsFiles(commandsPath);

for (const filePath of commandFiles) {
  const commandUrl = pathToFileURL(filePath).href;

  try {
    const { default: command } = await import(commandUrl);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(`⚠️ The command at ${filePath} is missing "data" or "execute".`);
    }
  } catch (err) {
    console.error(`❌ Failed to load command at ${filePath}:`, err);
  }
}

const rest = new REST().setToken(TOKEN);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationCommands(BOT_ID),
      { body: commands },
    );

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('❌ Failed to refresh commands:', error);
  }
})();
