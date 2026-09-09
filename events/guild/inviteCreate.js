import { Events } from 'discord.js';
import { InviteCacheSchema, Settings } from '#models';

export default {
	name: Events.InviteCreate,
	once: false,

	async execute(client, invite) {
		try {
			const settings = await Settings.findOne({ guildId: invite.guild.id });
			
			if (!settings || !settings.inviteLogStatus) return;
			
			await InviteCacheSchema.findOneAndUpdate(
				{ guildId: invite.guild.id, code: invite.code },
				{
					inviterId: invite.inviter?.id || 'unknown',
					uses: invite.uses || 0
				},
				{ upsert: true }
			);
		} catch (err) {
			console.error(`[InviteCreate] Davet cache'e eklenemedi:`, err);
		}
	}
};
