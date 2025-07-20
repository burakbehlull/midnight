import { EmbedBuilder } from 'discord.js';
import { splitMessage } from '#helpers'
import { GeminiAI } from '#libs'



export default {
  name: 'ai',
  description: 'Google Gemini ile sohbet et.',
  usage: '.ai <message>',
  category: 'utility',

  async execute(client, message, args) {
	const gemini = new GeminiAI()
    const userInput = args.join(' ');
    if (!userInput) {
      return message.reply('❌ Lütfen bir mesaj yaz.');
    }

    await message.channel.sendTyping();

    const reply = await gemini.ask(message.channel.id, userInput);

    const parts = splitMessage(reply, 1500);
    for (const part of parts) {
      await message.reply({ content: part });
    }
  },
};
