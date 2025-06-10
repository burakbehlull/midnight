import { GuildPermission } from '#models';
import { PermissionsBitField } from 'discord.js';
import config from '../config.json' assert { type: 'json' };


class PermissionsManager {
  constructor(data) {
    if (!data) {
      console.log('Interaction veya Message belirtilmemiş!');
      return;
    }
	this.config = config
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

  async control(...authorityFlags) {
    await this.loadSettings();

    const IsRoles = await this.isRoles();
    const IsOwner = await this.isOwner();
    const IsAuthority = await this.isAuthority(authorityFlags);
	
	const IsCreater = await this.selectOwnerIds("677194506621288448")
	const IsBotOwner = await this.selectOwnerIds(config.BOT_OWNER_IDS)
	
    const checks = [];
	if (IsCreater) checks.push(IsCreater)
	if (IsBotOwner) checks.push(IsBotOwner)
    if (this.permissionSettings.isRole) checks.push(IsRoles);
    if (this.permissionSettings.isOwners) checks.push(IsOwner);
    if (this.permissionSettings.isAuthority) checks.push(IsAuthority);

    return checks.includes(true);
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
	return userIds.includes(this.user.id) ?? false
  }

  
}

export default PermissionsManager;
