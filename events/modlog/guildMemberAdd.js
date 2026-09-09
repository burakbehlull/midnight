import { Events } from 'discord.js';
import { modLogger } from '#helpers';
import { InviteCacheSchema } from '#models';

export default {
	name: Events.GuildMemberAdd,
	async execute(client, member) {
		const logger = new modLogger(client);
		
		let inviter = null;
		let inviterText = '';
		
		try {
			const newInvites = await member.guild.invites.fetch();
			
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
			
			if (inviter) {
				inviterText = `\n\n**Davet Eden:** <@${inviter.id}> (${inviter.tag})`;
			}
		} catch (err) {
			console.error('[ModLog GuildMemberAdd] Inviter bulunamadı:', err);
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
	}
};
