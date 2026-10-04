import { Events } from 'discord.js';
import { actionReactionRemoveHandler } from "#handlers";

export default {
  name: Events.MessageReactionRemove,
  async execute(client, reaction, user) {
    try {
      if (reaction.partial) {
        try { await reaction.fetch(); } catch { return; }
      }
      await actionReactionRemoveHandler(reaction, user);
    } catch (err) {
      console.error('[MessageReactionRemove event err]', err);
    }
  }
};
