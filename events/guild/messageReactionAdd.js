import { Events } from 'discord.js';
import { actionReactionAddHandler } from "#handlers";

export default {
  name: Events.MessageReactionAdd,
  async execute(client, reaction, user) {
    try {
      if (reaction.partial) {
        try { await reaction.fetch(); } catch { return; }
      }
      await actionReactionAddHandler(reaction, user);
    } catch (err) {
      console.error('[MessageReactionAdd event err]', err);
    }
  }
};
