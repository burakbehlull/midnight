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

export default mongoose.model('Room', roomSchema);
