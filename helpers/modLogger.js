import { ModLogConfig } from '#models';
import { messageSender } from '#helpers';

class ModLogger {
  constructor(client) {
    this.client = client;
    this.sender = new messageSender(client);
  }
  
  async getLogStatus(guildId){
	  const result = ModLogConfig.findOne({ guildId });
	  return !result?.modLogStatus || false
  }

  async getLogChannelId(guildId, logType) {
    const config = await ModLogConfig.findOne({ guildId });
    if (!config || !config.modLogStatus) return null;
	
    return config?.logs[logType] || config?.generalLogChannel || null;
  }

  async sendLog({ guild, type, embed }) {
    try {
      if (!guild || !this.client.guilds.cache.has(guild.id)) return;

      const channelId = await this.getLogChannelId(guild.id, type);
      if (!channelId) return;

      const channel = await this.client.channels.fetch(channelId).catch(() => null);
      if (!channel) return;

      await channel.send({ embeds: [embed] }).catch(console.error);
    } catch (error) {
      
      if (error.code === 10004 || error.code === 10003) return;
      console.error('ModLogger sendLog error:', error);
    }
  }

  async logEvent({ guild, type, title, description, color, fields = [], author, footer }) {
    if (!guild) return;

    const embed = this.sender.embed({
      title,
      description,
      author,
	  color,
      fields,
	  footer,
      timestamp: new Date()
    });

    await this.sendLog({ guild, type, embed });
  }
}

export default ModLogger;
