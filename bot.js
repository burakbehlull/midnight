import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config'

import { Base } from "./libs/index.js"
import DB from "./config/db.js"

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
    ]
});

DB()

const base = new Base(client)
base.loadCommands()
base.loadEvents()
base.connect()







