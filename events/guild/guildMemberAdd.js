import { Events } from 'discord.js';

import { autoRoleHandler } from '#handlers';

export default {
  name: Events.GuildMemberAdd,
  once: false,
  
  async execute(client, member) {
    await autoRoleHandler(member);
  }
  
}
