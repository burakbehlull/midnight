import mongoose from 'mongoose';

const actionLimitsSchema = new mongoose.Schema({
  guildId: { 
    type: String, 
    required: true 
  },
  userId: { 
    type: String, 
    required: true 
  },
  
  actions: {
    ban: { 
      count: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    kick: { 
      count: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    roleAssign: { 
      count: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    roleCreate: { 
      count: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    roleDelete: { 
      count: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    roleUpdate: { 
      count: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    channelCreate: { 
      count: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    channelDelete: { 
      count: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    },
    channelUpdate: { 
      count: { type: Number, default: 0 },
      lastReset: { type: Date, default: Date.now }
    }
  },

  warnings: {
    spam: { type: Number, default: 0 },
    advertisement: { type: Number, default: 0 }
  },

  recentMessages: [{
    content: String,
    timestamp: Date
  }],

  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
});

actionLimitsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

actionLimitsSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 120 });

export default mongoose.model('ActionLimits', actionLimitsSchema);
