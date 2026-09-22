import { Events } from 'discord.js';
import { deletedMessageHandler } from "#handlers"

export default {
  name: Events.MessageDelete, 
  async execute(client, message) {
    if (message.author?.bot) return
	try {
		
      await deletedMessageHandler(client, message);
    } catch (error) {
      console.error(`❌ Message Delete: `, error); 
    }
  },
};
