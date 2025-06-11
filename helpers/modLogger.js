// import ModLogConfig from '../models/ModLogConfig.js';
import { messageSender } from '#helpers';

class ModLogger {
  constructor(client) {
    this.client = client;
    this.sender = new messageSender(client);
  }

  async getLogChannelId(guildId, logType) {
    const config = {}
    if (!config) return null;

    return "1246874463241506920" || config?.logs[logType] || config?.generalLogChannel || null;
  }

  async sendLog({ guild, type, embed }) {
    const channelId = await this.getLogChannelId(guild.id, type);
    if (!channelId) return;

    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    channel.send({ embeds: [embed] }).catch(console.error);
  }

  async logEvent({ guild, type, title, description, fields = [], author, footer }) {
    if (!guild) return;

    const embed = this.sender.embed({
      title,
      description,
      author,
      fields,
	  footer,
      timestamp: new Date()
    });

    await this.sendLog({ guild, type, embed });
  }
}

export default ModLogger;
