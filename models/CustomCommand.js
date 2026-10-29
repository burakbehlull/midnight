import { Schema, model } from 'mongoose';

const customCommandSchema = new Schema({
  guildId: { type: String, required: true },
  commandName: { type: String, required: true, lowercase: true, trim: true },
  
  // Komut ayarları
  description: { type: String, default: 'Özel komut' },
  enabled: { type: Boolean, default: true },
  
  // Aksiyon tipi: 'text', 'embed', 'role', 'multi'
  actionType: { 
    type: String, 
    required: true,
    enum: ['text', 'embed', 'role', 'multi']
  },
  
  // Text aksiyonu için
  responseText: { type: String },
  
  // Embed aksiyonu için
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
  
  // Rol aksiyonu için
  roleActions: [{
    roleId: String,
    action: { type: String, enum: ['add', 'remove', 'toggle'] }
  }],
  
  // Multi aksiyon için (birden fazla aksiyon yapabilir)
  multiActions: [{
    type: { type: String, enum: ['text', 'embed', 'role'] },
    data: Schema.Types.Mixed
  }],
  
  // Kullanım istatistikleri
  usageCount: { type: Number, default: 0 },
  lastUsed: { type: Date },
  
  // Yetki ayarları
  requiredRoles: [{ type: String }],
  requiredPermissions: [{ type: String }],
  allowedChannels: [{ type: String }],
  
  // Cooldown (saniye cinsinden)
  cooldown: { type: Number, default: 0 },
  
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Aynı sunucuda aynı isimde komut olamaz
customCommandSchema.index({ guildId: 1, commandName: 1 }, { unique: true });

export default model('CustomCommand', customCommandSchema);
