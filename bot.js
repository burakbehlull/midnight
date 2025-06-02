import { Client } from 'discord.js';
import 'dotenv/config'

import { Base } from "#libs"
import { misc } from "#helpers"

import DB from "./config/db.js"

const client = new Client({
    intents: misc.itentsMiddle()
})

DB()

const base = new Base(client)
base.loadCommands()
base.loadEvents()
base.connect()







