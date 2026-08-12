import { GuildPermission } from '#models';
import { PermissionsBitField } from 'discord.js';
import config from '../config.json' with { type: 'json' };

class PermissionsManager {
  constructor(data) {
    if (!data) {
      console.log('Interaction veya Message belirtilmemiş!');
      return;
    }
    this.config = config;
    this.interaction = data?.isChatInputCommand?.() ? data : null;
    this.message = data?.content ? data : null;

    this.user = this.interaction?.user || this.message?.author;
    this.guild = this.interaction?.guild || this.message?.guild;
    this.member = this.interaction?.member || this.message?.member || null;

    this.flags = PermissionsBitField.Flags;
    this.permissionSettings = null;
  }

  async loadSettings() {
    if (!this.guild) return false;

    this.permissionSettings = await GuildPermission.findOne({ guildId: this.guild.id });
    if (!this.permissionSettings) {
      this.permissionSettings = {
        isOwners: false,
        owners: [],
        isRole: false,
        roles: [],
        isAuthority: true,
      };
    } 
  }

  // Klasik genel kontrol
  async control(...authorityFlags) {
    await this.loadSettings();

    const IsRoles = await this.isRoles();
    const IsOwner = await this.isOwner();
    const IsAuthority = await this.isAuthority(authorityFlags);
  
    const IsCreater = await this.selectOwnerIds("470548458072440842");
    const IsBotOwner = await this.selectOwnerIds(config.BOT_OWNER_IDS);
    
    const checks = [];
    if (IsCreater) checks.push(IsCreater);
    if (IsBotOwner) checks.push(IsBotOwner);
    if (this.permissionSettings.isRole) checks.push(IsRoles);
    if (this.permissionSettings.isOwners) checks.push(IsOwner);
    if (this.permissionSettings.isAuthority) checks.push(IsAuthority);

    return checks.includes(true);
  }

  async checkPermissions(cmdPermissions = {}) {
    if (!this.user || !this.guild) return true;

    const enabled = cmdPermissions?.enabled;
    if (enabled === false) return true;

    const isCreator = await this.selectOwnerIds("470548458072440842");
    if (isCreator) return true;

    const isBotOwner = await this.selectOwnerIds(config.BOT_OWNER_IDS);
    if (isBotOwner) return true;

    await this.loadSettings();

    if (await this.isOwner()) return true;
    if (await this.isRoles()) return true;

    const { authorities = [], user = [], roles = [] } = cmdPermissions || {};

    if (!authorities.length && !user.length && !roles.length) return true;

    if (Array.isArray(user) && user.length > 0 && user.includes(this.user.id)) return true;

    if (Array.isArray(roles) && roles.length > 0 && this.member?.roles?.cache?.some(r => roles.includes(r.id))) return true;

    if (Array.isArray(authorities) && authorities.length > 0 && this.member?.permissions?.has(authorities)) return true;
    
    return false;
  }

  async isOwner() {
    if (!this.permissionSettings || !this.permissionSettings.isOwners) return false;
    const userId = this.user?.id;
    return this.permissionSettings.owners.includes(userId);
  }

  async isRoles() {
    if (!this.permissionSettings || !this.permissionSettings.isRole) return false;
    if (!this.guild || !this.user) return false;

    let member = this.guild.members.cache.get(this.user.id);
    if (!member) {
      member = await this.guild.members.fetch(this.user.id).catch(() => null);
    }
    if (!member) return false;

    const roles = this.permissionSettings.roles || [];
    return roles.some(roleId => member.roles.cache.has(roleId));
  }

  async isAuthority(...authorities) {
    if (!this.permissionSettings || !this.permissionSettings.isAuthority) return false;
    if (!authorities.length) return false;

    return this.member?.permissions?.has(authorities);
  }
  
  async isGuildOwner() {
    if (!this.guild || !this.user) return false;
    return this.guild.ownerId === this.user.id;
  }
  
  async selectOwnerIds(...userIds) {
    if (!this.guild || !this.user) return false;
    const flatIds = [];
    for (const item of userIds) {
      if (Array.isArray(item)) flatIds.push(...item);
      else if (item != null) flatIds.push(item);
    }
    return flatIds.includes(this.user.id);
  }
}

export default PermissionsManager;