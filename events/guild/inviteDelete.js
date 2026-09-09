import { Events } from 'discord.js';
import { InviteCacheSchema, Settings } from '#models';

export default {
	name: Events.InviteDelete,
	once: false,

	async execute(client, invite) {
		try {
			const settings = await Settings.findOne({ guildId: invite.guild.id });
			
			if (!settings || !settings.inviteLogStatus) return;
			
			await InviteCacheSchema.findOneAndDelete({
				guildId: invite.guild.id,
				code: invite.code
			});
		} catch (err) {
			console.error(`[InviteDelete] Davet cache'den silinemedi:`, err);
		}
	}
};
