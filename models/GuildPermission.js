import mongoose from 'mongoose';

const GuildPermissionSchema = new mongoose.Schema({
  guildId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  isOwners: { 
    type: Boolean, 
    default: false 
  },
  owners: { 
    type: [String],  
    default: []    
  },
  isRole: { 
    type: Boolean, 
    default: false 
  },
  roles: { 
    type: [String],  
    default: []      
  },
  isAuthority: { 
    type: Boolean, 
    default: true 
  },
  // Yeni field'lar
  staffRoles: {
    type: [String],
    default: []
  },
  adminRoles: {
    type: [String],
    default: []
  },
  safeUsers: {
    type: [String],
    default: []
  }
}); 

export default mongoose.model('GuildPermission', GuildPermissionSchema);