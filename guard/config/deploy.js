import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.env'),
})

import { Loaders } from '#helpers'

const TOKEN = process.env.GUARD_TOKEN;
const BOT_ID = process.env.GUARD_BOT_ID;

if (!TOKEN || !BOT_ID) {
  console.error('❌ GUARD_TOKEN veya GUARD_BOT_ID tanımlı değil.');
  process.exit(1);
}

const slashCommands = await Loaders.getDeployableSlashCommands()

await Loaders.deploySlashCommands(TOKEN, BOT_ID, slashCommands)
