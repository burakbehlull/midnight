import { Events } from 'discord.js';
import { levelVoiceHandler } from '#handlers';

const activeUsers = new Map();
const intervalUsers = new Map();

const XP_INTERVAL = 60000; 

setInterval(async () => {
  for (const [userId, userData] of intervalUsers.entries()) {
    const { guildId, guild } = userData;
    await levelVoiceHandler.handleVoiceActivity(userId, guildId, 1, guild);
  }
}, XP_INTERVAL);

export default {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
	  
	
	// level system
    const userId = newState.id;
    const guildId = newState.guild.id;

    if (!oldState.streaming && newState.streaming) {
      await levelVoiceHandler.handleStream(userId, guildId);
    }

    if (!oldState.selfVideo && newState.selfVideo) {
      await levelVoiceHandler.handleCamera(userId, guildId);
    }

    if (!oldState.channel && newState.channel) {
      activeUsers.set(userId, Date.now());

      intervalUsers.set(userId, {
        guildId,
        guild: newState.guild
      });
    }

    if (oldState.channel && !newState.channel) {
      if (activeUsers.has(userId)) {
        const joinTime = activeUsers.get(userId);
        const durationMin = Math.floor((Date.now() - joinTime) / 60000);

        activeUsers.delete(userId);

        await levelVoiceHandler.handleVoiceActivity(userId, guildId, durationMin, newState.guild);
      }

      intervalUsers.delete(userId);
    }
	// level system /
	
  },
};
