import config from '../config.json' assert { type: 'json' };
import { PermissionsBitField } from 'discord.js'

const permissions = config.permissions

class PermissionsManager {
	constructor(data) {
		if (!data) {
			console.log('Interaction veya Message belirtilmemiş!')
			return
		}

		this.interaction = data?.isChatInputCommand?.() ? data : null
		this.message = data?.content ? data : null

		this.user = this.interaction?.user || this.message?.author
		this.guild = this.interaction?.guild || this.message?.guild
		this.member = this.interaction?.member || this.message?.member || null

		this.permissions = permissions
		this.flags = PermissionsBitField.Flags
	}

	async control(...authorityFlags){
		const IsRoles = await this.isRoles();
		const IsOwner = await this.isOwner();
		const IsAuthority = await this.isAuthority(authorityFlags);

		const checks = [];
		if (this.permissions.isRole) checks.push(IsRoles);
		if (this.permissions.isOwners) checks.push(IsOwner);
		if (this.permissions.isAuthority) checks.push(IsAuthority);

		const hasAtLeastOnePermission = checks.includes(true);
		return hasAtLeastOnePermission
	}

	async isOwner() {
		const userId = this.user?.id
		const { owners, isOwners } = this.permissions
		if (isOwners) {
			return owners.includes(userId)
		}
		return false
	}

	async isRoles() {
		const { roles, isRole } = this.permissions
		if (!isRole) return false
		if (!this.guild || !this.user) return false

		let member = this.guild.members.cache.get(this.user.id)
		if (!member) {
			member = await this.guild.members.fetch(this.user.id).catch(() => null)
		}
		if (!member) return false

		const status = roles.map(role => member.roles.cache.has(role))
		return status.includes(true)
	}

	async isAuthority(...authorities) {
		if (this.permissions.isAuthority && authorities.length) {
			return this.member?.permissions?.has(authorities)
		}
		return false
	}

	async selectOwnerIds(status, ...userIds) {
		const userId = this.user?.id
		if (status && userIds?.length) {
			return userIds.includes(userId)
		}
		return false
	}

	async selectRolesIds(status, ...rolesIds) {
		if (!this.guild || !this.user) return false
		const member = this.guild.members.cache.get(this.user.id)
		if (!member) return false

		if (status && rolesIds?.length) {
			const hasRole = rolesIds.some(role => member.roles.cache.has(role))
			return hasRole
		}
		return false
	}
}

export default PermissionsManager
