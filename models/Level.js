import mongoose from "mongoose";

const levelSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  messageXP: { type: Number, default: 0 },
  voiceXP: { type: Number, default: 0 },
  messageLevel: { type: Number, default: 0 },
  voiceLevel: { type: Number, default: 0 },
});

export default mongoose.model("Level", levelSchema);
