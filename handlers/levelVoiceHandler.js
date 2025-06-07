import { Level } from "#models";
import { misc } from "#helpers";


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
