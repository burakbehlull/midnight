import { Events } from 'discord.js';
import { deleteMessageHandler } from "#handlers"

export default {
  name: Events.MessageDelete, 
  async execute(client, message) {
    if (message.author.bot) return
	try {
		
      await deleteMessageHandler(message);
    } catch (error) {
      console.error(`❌ Message Delete: `, error); 
    }
  },
};
