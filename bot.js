import "dotenv/config";

import { Client, Partials } from "discord.js";
import { Agent } from "undici";

import { Core } from "#libs";
import { misc } from "#helpers";
import { Database } from "#config";

export default class Bot {
  constructor(token, botId) {
    const restTimeout = Number(process.env.HTTP_TIMEOUT_MS || 60_000);
    const connectTimeout = Number(process.env.HTTP_CONNECT_TIMEOUT_MS || 30_000);
    this.client = new Client({
        intents: misc.itentsAll(),
        partials: [Partials.Message, Partials.Channel, Partials.User],
        rest: {
          agent: new Agent({ connect: { timeout: connectTimeout } }),
          timeout: restTimeout
        }
    });
    this.token = token || process.env.TOKEN;
    this.botId = botId || process.env.BOT_ID;
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





