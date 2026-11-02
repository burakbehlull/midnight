import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true
  },
  id: {
    type: String,
    required: true
  },
  ownerId: {
    type: String,
    required: true
  }
});

const roomSetupSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  createChannelId: {
    type: String,
    required: true
  },
  categoryId: {
    type: String,
    required: true
  },
  textChannelId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const RoomSetup = mongoose.model('RoomSetup', roomSetupSchema);
export default mongoose.model('Room', roomSchema);
