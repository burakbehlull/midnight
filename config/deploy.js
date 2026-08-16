import "dotenv/config";
import { Loaders } from '#helpers'

const TOKEN = process.env.TOKEN;
const BOT_ID = process.env.BOT_ID;

const slashCommands = await Loaders.getDeployableSlashCommands()

await Loaders.deploySlashCommands(TOKEN, BOT_ID, slashCommands)
