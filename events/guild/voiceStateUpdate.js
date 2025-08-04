import { Events } from 'discord.js';
import { levelVoiceHandler, statsUtilsHandler, handleVoiceRoomCreate } from '#handlers';
import { Settings } from "#models";

// level system
const activeUsers = new Map();
const intervalUsers = new Map();

const XP_INTERVAL = 60000; 

setInterval(async () => {
  for (const [userId, userData] of intervalUsers.entries()) {
    const { guildId, guild } = userData;
    await levelVoiceHandler.handleVoiceActivity(userId, guildId, 5, guild);
  }
}, XP_INTERVAL);
// level system  /

const voiceJoinTimestamps = new Map(); // stats

export default {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
	  
	const member = newState.member ?? oldState.member;
	if (!member || member.user.bot) return;
	
	await handleVoiceRoomCreate(oldState, newState)
	  
	const guild = newState.guild;
    const settings = await Settings.findOne({ guildId: guild.id });
	
	const userId = newState.id;
	const guildId = newState.guild.id;
	
	// level system
	if(settings?.levelSystemStatus){
		if (!oldState.streaming && newState.streaming) await levelVoiceHandler.handleStream(userId, guildId);
		

		if (!oldState.selfVideo && newState.selfVideo) await levelVoiceHandler.handleCamera(userId, guildId);
		

		if (oldState.channelId !== newState.channelId && newState.channelId !== null) {
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
	}
	
	// stats system
	if(settings?.statSystemStatus){
		if (!oldState.channelId && newState.channelId) {
		  voiceJoinTimestamps.set(userId, { time: Date.now(), channelId: newState.channelId });
		}

		if (oldState.channelId && !newState.channelId) {
		  const data = voiceJoinTimestamps.get(userId);
		  if (data) {
			const duration = Date.now() - data.time;
			await statsUtilsHandler.updateVoiceStats(userId, guildId, data.channelId, duration);
			voiceJoinTimestamps.delete(userId);
		  }
		}
	}
	
  },
};
