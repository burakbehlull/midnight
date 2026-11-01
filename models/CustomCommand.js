import { Schema, model } from 'mongoose';

const customCommandSchema = new Schema({
  guildId: { type: String, required: true },
  commandName: { type: String, required: true, lowercase: true, trim: true },
  

  description: { type: String, default: 'Özel komut' },
  enabled: { type: Boolean, default: true },
  

  actionType: { 
    type: String, 
    required: true,
    enum: ['text', 'embed', 'role', 'multi']
  },
  

  responseText: { type: String },
  

  embedData: {
    title: String,
    description: String,
    color: String,
    footer: String,
    image: String,
    thumbnail: String,
    fields: [{
      name: String,
      value: String,
      inline: { type: Boolean, default: false }
    }]
  },
  

  roleActions: [{
    roleId: String,
    action: { type: String, enum: ['add', 'remove', 'toggle'] }
  }],
  

  multiActions: [{
    type: { type: String, enum: ['text', 'embed', 'role'] },
    data: Schema.Types.Mixed
  }],
  

  usageCount: { type: Number, default: 0 },
  lastUsed: { type: Date },
  

  requiredRoles: [{ type: String }],
  requiredPermissions: [{ type: String }],
  allowedChannels: [{ type: String }],
  
  cooldown: { type: Number, default: 0 },
  
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});


customCommandSchema.index({ guildId: 1, commandName: 1 }, { unique: true });

export default model('CustomCommand', customCommandSchema);
