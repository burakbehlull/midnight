import { UserStats } from '#models';
import dayjs from 'dayjs';

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h} saat, ${m} dakika, ${s} saniye`;
}

async function updateMessageStats(userId, guildId, channelId) {
  const today = dayjs().format('YYYY-MM-DD');

  const stats = await UserStats.findOneAndUpdate(
    { userId, guildId },
    {
      $inc: {
        totalMessages: 1,
        [`messagePerDay.${today}`]: 1
      }
    },
    { upsert: true, new: true }
  );

  let channel = stats.messageChannels.find(c => c.channelId === channelId);
  if (channel) {
    channel.count += 1;
  } else {
    stats.messageChannels.push({ channelId, count: 1 });
  }

  await stats.save();
}


async function updateVoiceStats(userId, guildId, channelId, durationMs) {
  const today = dayjs().format('YYYY-MM-DD');

  const stats = await UserStats.findOneAndUpdate(
    { userId, guildId },
    {
      $inc: {
        totalVoice: durationMs,
        [`voicePerDay.${today}`]: durationMs
      }
    },
    { upsert: true, new: true }
  );

  let channel = stats.voiceChannels.find(c => c.channelId === channelId);
  if (channel) {
    channel.duration += durationMs;
  } else {
    stats.voiceChannels.push({ channelId, duration: durationMs });
  }

  await stats.save();
}


async function getUserStats(userId, guildId) {
  const stats = await UserStats.findOne({ userId, guildId });
  if (!stats) return null;

  const now = dayjs();
  const last7 = Array.from({ length: 7 }, (_, i) => now.subtract(i, 'day').format('YYYY-MM-DD'));
  const today = now.format('YYYY-MM-DD');

  const weeklyMessages = last7.reduce((acc, d) => acc + (Number(stats.messagePerDay.get(d)) || 0), 0);
  const dailyMessages = Number(stats.messagePerDay.get(today)) || 0;

  const weeklyVoice = last7.reduce((acc, d) => acc + (Number(stats.voicePerDay.get(d)) || 0), 0);
  const dailyVoice = Number(stats.voicePerDay.get(today)) || 0;

  return {
    days: Object.keys(stats.messagePerDay || {}).length,
    totalMessages: stats.totalMessages,
    weeklyMessages,
    dailyMessages,
    totalVoice: formatDuration(stats.totalVoice),
    weeklyVoice: formatDuration(weeklyVoice),
    dailyVoice: formatDuration(dailyVoice),
    topMessageChannels: stats.messageChannels
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topVoiceChannels: stats.voiceChannels
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map(c => ({ id: c.channelId, duration: formatDuration(c.duration) }))
  };
}

async function getTopMessageUsers(guildId) {
  return await UserStats.find({
    guildId,
    totalMessages: { $gt: 0 }
  })
  .sort({ totalMessages: -1 })
  .limit(5);
}

async function getTopVoiceUsers(guildId) {
  return await UserStats.find({
    guildId,
    totalVoice: { $gt: 0 }
  })
  .sort({ totalVoice: -1 })
  .limit(5);
}

export {
  formatDuration,
  updateMessageStats,
  updateVoiceStats,
  getUserStats,
  getTopMessageUsers,
  getTopVoiceUsers
};
