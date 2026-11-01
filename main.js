import "clean-error-stack/register";
import Bot from "./bot.js";
import GuardBot from "./guard/bot.js";
import MidnightAPI from "./api/server.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const FATAL_PATTERN = /invalid token|token_invalid|unauthorized|401/i;
const TRANSIENT_PATTERN =
  /connecttimeouterror|connect timeout|headers timeout|body timeout|econnreset|econnrefused|etimedout|eai_again|enotfound|epipe|und_err_|socket hang up|fetch failed|network|timeout/i;

function isTransientError(error) {
  const text = `${error?.name ?? ""} ${error?.code ?? ""} ${error?.message ?? ""}`;
  if (FATAL_PATTERN.test(text)) return false;
  return TRANSIENT_PATTERN.test(text);
}

async function startWithRetry(label, factory, attempts = 10, maxDelayMs = 30_000) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await factory();
    } catch (error) {
      const transient = isTransientError(error);
      console.error(
        `⚠️ ${label} başlatma denemesi ${attempt}/${attempts} başarısız: ${error?.message ?? error}`
      );
      if (!transient || attempt === attempts) throw error;

      const wait = Math.min(maxDelayMs, 3_000 * attempt);
      console.log(`⏳ ${label}: ${wait / 1000} sn sonra tekrar denenecek...`);
      await delay(wait);
    }
  }
}

const core = await startWithRetry("Moderation botu", () => new Bot().run());

let guardCore = null;
if (process.env.GUARD_TOKEN) {
  try {
    guardCore = await startWithRetry(
      "Guard botu",
      () => new GuardBot(process.env.GUARD_TOKEN, process.env.GUARD_BOT_ID).run()
    );
  } catch (error) {
    console.error("❌ Guard botu başlatılamadı:", error);
  }
} else {
  console.warn("⚠️ GUARD_TOKEN tanımlı değil, guard botu başlatılmadı.");
}

if (guardCore?.client?.guardManager) {
  core.client.guardManager = guardCore.client.guardManager;
}

const api = new MidnightAPI(core.client, guardCore?.client ?? null);
api.start();
