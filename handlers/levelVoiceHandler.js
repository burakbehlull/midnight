import { Level } from "#models";

export function calculateLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

export async function handleVoiceActivity(userId, guildId, durationMinutes, guild) {
  const user = await Level.findOneAndUpdate(
    { userId, guildId },
    { $inc: { voiceXP: durationMinutes } },
    { upsert: true, new: true }
  );

  const newLevel = calculateLevel(user.voiceXP);
  if (newLevel > user.voiceLevel) {
    user.voiceLevel = newLevel;
    await user.save();
  }
}

export async function handleStream(userId, guildId) {
  await Level.findOneAndUpdate(
    { userId, guildId },
    { $inc: { totalStreams: 1 } },
    { upsert: true }
  );
}

export async function handleCamera(userId, guildId) {
  await Level.findOneAndUpdate(
    { userId, guildId },
    { $inc: { totalCameraOpens: 1 } },
    { upsert: true }
  );
}
