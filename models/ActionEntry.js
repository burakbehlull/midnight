import mongoose from 'mongoose';

const actionEntrySchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  groupId: { type: String, required: true, index: true },
  entryId: { type: Number, required: true },
  type: { type: String, required: true, enum: ['emoji', 'button'] },
  roleId: { type: String, required: true },
  emojiId: { type: String, default: null },
  emojiName: { type: String, default: null },
  emojiAnimated: { type: Boolean, default: false },
  emojiRaw: { type: String, default: null },
  buttonStyle: {
    type: String,
    default: 'secondary',
    enum: ['primary', 'secondary', 'success', 'danger', 'warning']
  },
  buttonLabel: { type: String, default: null }
});

actionEntrySchema.index({ guildId: 1, groupId: 1, entryId: 1 }, { unique: true });

export default mongoose.model('ActionEntry', actionEntrySchema);
