import { Events, PermissionFlagsBits } from 'discord.js';
import { modLogger } from '#helpers';
import { InviteCacheSchema } from '#models';

export default {
	name: Events.GuildMemberAdd,
	async execute(client, member) {
		try {
			const logger = new modLogger(client);
			
			let inviter = null;
			let inviterText = '';
			
			try {
				const botMember = member.guild.members.cache.get(client.user.id);
				if (botMember && botMember.permissions.has(PermissionFlagsBits.ManageGuild)) {
					const newInvites = await member.guild.invites.fetch().catch(() => null);
					
					if (newInvites) {
						for (const [code, invite] of newInvites) {
							const cached = await InviteCacheSchema.findOne({ 
								guildId: member.guild.id, 
								code 
							});

							if (cached && invite.uses > cached.uses) {
								inviter = invite.inviter;
								break;
							}
						}
					}
					
					if (inviter) {
						inviterText = `\n\n**Davet Eden:** <@${inviter.id}> (${inviter.tag})`;
					}
				}
			} catch (err) {

			}
			
			await logger.logEvent({
				guild: member.guild,
				author: { name: member.guild.name, iconURL: member.guild.iconURL() },
				type: 'joinLeave',
				title: null,
				color: '#6A9BD8',
				description: `<@${member.id}> adlı kullanıcı sunucuya giriş yaptı!${inviterText}`,
				footer: { text: member.user.tag, iconURL: member.user.displayAvatarURL() }
			});
		} catch (error) {
			if (error.code === 50013 || error.code === 10004) return;
			console.error('[guildMemberAdd] Hata:', error.message);
		}
	}
};
