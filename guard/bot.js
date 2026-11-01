import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env"),
});

import { Client, Partials } from "discord.js";
import { Agent } from "undici";

import { Core } from "#libs";
import { misc } from "#helpers";
import { Database } from "#config";
import { PermissionsManager, BackupManager, GuardManager } from "#managers";

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
    this.token = token || process.env.GUARD_TOKEN;
    this.botId = botId || process.env.GUARD_BOT_ID;
    if (!this.token) {
      throw new Error('GUARD_TOKEN tanımlı değil. Ana dizindeki .env dosyasını kontrol edin.');
    }
    this.db = new Database();
  }
  async run() {
    await this.db.connect();

    console.log('🛡️ Guard sistemi başlatılıyor...');
    
    this.client.permissionsManager = new PermissionsManager(this.client);
    this.client.backupManager = new BackupManager(this.client);
    this.client.guardManager = new GuardManager(
      this.client, 
      this.client.permissionsManager, 
      this.client.backupManager
    );

    console.log('✅ Guard manager\'ları yüklendi.');

    const core = new Core(this.client, this.token, this.botId);
    await core.loaders();
    
    await core.connect();

    process.on('SIGINT', async () => {
      console.log('\n🔄 Bot kapatılıyor...');
      
      if (this.client.backupManager) {
        this.client.backupManager.cleanup();
      }
      
      process.exit(0);
    });

    return core;
  }
}





