import { splitMessage } from '#helpers'
import { GeminiAI } from '#libs'
import Manager from "#managers";

export default {
  name: 'ai',
  description: 'Google Gemini ile sohbet et.',
  usage: '.ai <message>',
  category: 'extra',

  permissions: {
		enabled: false
	},

  async execute(client, message, args) {


  const manager = new Manager(client);

    if(!manager.config.AI.ReplyCommand) return

	  const gemini = new GeminiAI()
    const userInput = args.join(' ');
    
    if (!userInput) {
      return message.reply('❌ Lütfen bir mesaj yaz.');
    }

    const ownerCheckRegex = /kimin\s+(botu|yılanı|yilani|yılanısın|yilanisin|botusun)/i;
    if (ownerCheckRegex.test(userInput)) {
      return message.reply('Burağın yılanıyım 🐍');
    }

    await message.channel.sendTyping();

    const reply = await gemini.ask(message.channel.id, userInput);

    const parts = splitMessage(reply, 1500);
    for (const part of parts) {
      await message.reply({ content: part });
    }
  },
};
