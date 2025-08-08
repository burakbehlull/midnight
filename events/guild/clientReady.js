import { InviteCacheSchema } from '#models';

export default {
  name: 'ready',
  async execute(client) {
	  
	// invites of user
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const invites = await guild.invites.fetch();

        for (const [code, invite] of invites) {
          await InviteCacheSchema.findOneAndUpdate(
            { guildId, code },
            {
              inviterId: invite.inviter?.id || 'unknown',
              uses: invite.uses
            },
            { upsert: true }
          );
        }
      } catch (err) {
        console.error(`[${guild.name}] davetler alınamadı:`, err);
      }
    }
	
	
  }
};
