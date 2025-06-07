import { Level } from "#models";

export function calculateLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

export default async function levelMessageHandler(userId, guildId, message) {
  const user = await Level.findOneAndUpdate(
    { userId, guildId },
    { $inc: { messageXP: 5 } },
    { upsert: true, new: true }
  );

  const newLevel = calculateLevel(user.messageXP);
  if (newLevel > user.messageLevel) {
    user.messageLevel = newLevel;
    await user.save();
  }
}
