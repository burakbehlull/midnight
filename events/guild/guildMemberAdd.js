import { Events } from 'discord.js';

import { autoRoleHandler, inviteHandler } from '#handlers';

export default {
  name: Events.GuildMemberAdd,
  once: false,

  async execute(client, member) {
    await autoRoleHandler(member);
	await inviteHandler(client, member);
  }
  
}
