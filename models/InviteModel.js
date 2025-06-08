import mongoose from 'mongoose';

const InviteSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  invitesCount: { type: Number, default: 0 },
});

export default mongoose.model('Invite', InviteSchema);
