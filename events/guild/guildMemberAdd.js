import { Events } from 'discord.js';
import { autoRoleHandler } from '../../handlers/index.js';

export default {
  name: Events.GuildMemberAdd,
  once: false,
  
  async execute(client, member) {
    await autoRoleHandler(member);
  }
  
}
