import { Events } from 'discord.js';
import { deleteMessageHandler } from "#handlers"

export default {
  name: Events.MessageDelete, 
  async execute(client, message) {
    try {
      await deleteMessageHandler(message);
    } catch (error) {
      console.error(`❌ Message Delete: `, error); 
    }
  },
};
