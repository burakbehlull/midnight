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
  }
}); 

export default mongoose.model('GuildPermission', GuildPermissionSchema);