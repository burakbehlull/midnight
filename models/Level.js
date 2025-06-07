import mongoose from "mongoose";

const levelSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  messageXP: { type: Number, default: 0 },
  voiceXP: { type: Number, default: 0 },
  messageLevel: { type: Number, default: 0 },
  voiceLevel: { type: Number, default: 0 },
  totalCameraOpens: { type: Number, default: 0 },
  totalStreams: { type: Number, default: 0 },
});

export default mongoose.model("Level", levelSchema);
