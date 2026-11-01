import { Level } from "#models";
import { misc } from "#helpers";
import { statsUtilsHandler } from "#handlers";

export async function handleVoiceActivity(userId, guildId, durationMinutes, guild) {
  const user = await Level.findOneAndUpdate(
    { userId, guildId },
    { $inc: { voiceXP: durationMinutes } },
    { upsert: true, new: true }
  );

  const newLevel = misc.calculateLevel(user.voiceXP);
  if (newLevel > user.voiceLevel) {
    user.voiceLevel = newLevel;
    await user.save();
  }
}

export async function handleStream(userId, guildId) {
  await statsUtilsHandler.updateStreamStats(userId, guildId);
}

export async function handleCamera(userId, guildId) {
  await statsUtilsHandler.updateCameraStats(userId, guildId);
}
