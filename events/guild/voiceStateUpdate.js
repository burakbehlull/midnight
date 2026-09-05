import { Events } from 'discord.js';
import { levelVoiceHandler, statsUtilsHandler, handleVoiceRoomCreate } from '#handlers';
import { Settings } from "#models";

// level system
const activeUsers = new Map();
const intervalUsers = new Map();

const XP_INTERVAL = 60000; 

setInterval(async () => {
  for (const [key, userData] of intervalUsers.entries()) {
    const { guildId, guild, userId } = userData;
    await levelVoiceHandler.handleVoiceActivity(userId, guildId, 5, guild);
  }
}, XP_INTERVAL);
// level system  /

const voiceJoinTimestamps = new Map(); // stats

function makeKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

export async function initVoiceTimestampsForGuild(guild) {
  const settings = await Settings.findOne({ guildId: guild.id });
  if (!settings) return;

  const now = Date.now();

  for (const [channelId, channel] of guild.channels.cache) {
    if (channel.isVoiceBased()) {
      for (const [memberId, member] of channel.members) {
        if (member.user.bot) continue;

        const key = makeKey(guild.id, memberId);

        if (settings.levelSystemStatus && !activeUsers.has(key)) {
          activeUsers.set(key, now);
          intervalUsers.set(key, {
            userId: memberId,
            guildId: guild.id,
            guild
          });
        }

        if (settings.statSystemStatus && !voiceJoinTimestamps.has(key)) {
          voiceJoinTimestamps.set(key, { time: now, channelId });
        }
      }
    }
  }
}

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
    const key = makeKey(guildId, userId);

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;
    const channelChanged = oldChannelId !== newChannelId;
    const leftChannel = oldChannelId && !newChannelId;
    const joinedChannel = !oldChannelId && newChannelId;
    const movedChannel = oldChannelId && newChannelId && channelChanged;
	
	// level system
	if(settings?.levelSystemStatus){
		if (!oldState.streaming && newState.streaming) await levelVoiceHandler.handleStream(userId, guildId);
		

		if (!oldState.selfVideo && newState.selfVideo) await levelVoiceHandler.handleCamera(userId, guildId);
		

		if (joinedChannel || movedChannel) {
          if (movedChannel && activeUsers.has(key)) {
            const joinTime = activeUsers.get(key);
            const durationMin = Math.floor((Date.now() - joinTime) / 60000);
            if (durationMin > 0) {
              await levelVoiceHandler.handleVoiceActivity(userId, guildId, durationMin, guild);
            }
          }

		  activeUsers.set(key, Date.now());

		  intervalUsers.set(key, {
            userId,
			guildId,
			guild: newState.guild
		  });
		}
		
		if (leftChannel) {
			
		  if (activeUsers.has(key)) {
			const joinTime = activeUsers.get(key);
			const durationMin = Math.floor((Date.now() - joinTime) / 60000);

			activeUsers.delete(key);

			if (durationMin > 0) {
			  await levelVoiceHandler.handleVoiceActivity(userId, guildId, durationMin, newState.guild);
			}
		  
		  }

		  intervalUsers.delete(key);
		}
	}
	
	// stats system
	if(settings?.statSystemStatus){
		if (joinedChannel) {
		  voiceJoinTimestamps.set(key, { time: Date.now(), channelId: newChannelId });
		}

        if (movedChannel) {
          const prevData = voiceJoinTimestamps.get(key);
          if (prevData) {
            const duration = Date.now() - prevData.time;
            if (duration > 0) {
              await statsUtilsHandler.updateVoiceStats(userId, guildId, prevData.channelId, duration);
            }
          }
          voiceJoinTimestamps.set(key, { time: Date.now(), channelId: newChannelId });
        }

		if (leftChannel) {
		  const data = voiceJoinTimestamps.get(key);
		  if (data) {
			const duration = Date.now() - data.time;
            if (duration > 0) {
			  await statsUtilsHandler.updateVoiceStats(userId, guildId, data.channelId, duration);
            }
			voiceJoinTimestamps.delete(key);
		  }
		}
	}
	
  },
};
