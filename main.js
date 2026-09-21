import "clean-error-stack/register";
import Bot from "./Bot.js";
import MidnightAPI from "./api/server.js";

const bot = new Bot();
const core = await bot.run();

const api = new MidnightAPI(core.client);
api.start();