import { Events } from 'discord.js';
import { splitMessage } from "#helpers";
import { GeminiAI } from "#libs";
import Manager from "#managers";

export default {
  name: Events.MessageCreate, 
  async execute(client, message) {
    if(message.author.bot) return

    const manager = new Manager(client);


    if(!manager.config.AI.ReplyWrapper) return

    try {
        if (message.mentions.has(client.user)) {
          const mentionRegex = new RegExp(`<@!?${client.user.id}>\\s*`);
          const userInput = message.content.replace(mentionRegex, '').trim();

          if (!userInput) return

          const ownerCheckRegex = /kimin\s+(botu|yılanı|yilani|yılanısın|yilanisin|botusun)/i;
          if (ownerCheckRegex.test(userInput)) {
            return message.reply('Burağın yılanıyım 🐍');
          }

          await message.channel.sendTyping();

          const gemini = new GeminiAI();
          const reply = await gemini.ask(message.channel.id, userInput);

          const parts = splitMessage(reply, 1500);
          for (const part of parts) {
            await message.reply({ content: part });
          }
          return;
      } 
    } catch (error) {
      console.log('[ai] Hata:', error, error)
    }

  },
};
