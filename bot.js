import "dotenv/config";

import { Client, Partials } from "discord.js";

import { Core } from "#libs";
import { misc } from "#helpers";
import { Database } from "#config";

export default class Bot {
  constructor() {
    this.client = new Client({
        intents: misc.itentsAll(),
        partials: [Partials.Message, Partials.Channel, Partials.User]
    });
    this.token = process.env.TOKEN;
    this.botId = process.env.BOT_ID;
    this.db = new Database();
  }
  async run() {
    const core = new Core(this.client, this.token, this.botId);
    await core.loaders();
    await core.connect();

    this.db.connect();

    return core;
  }
}





