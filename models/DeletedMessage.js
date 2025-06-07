import mongoose from 'mongoose';

const deletedMessageSchema = new mongoose.Schema({
    messageContent: {
        type: String,
        required: false
    },
    authorTag: {
        type: String,
        required: true
    },
    channelId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

export default mongoose.model('DeletedMessage', deletedMessageSchema)
