import { Afk } from '#models';
import { messageSender } from '#helpers';

export default {
  name: 'afk',
  description: 'AFK moduna geçersin.',
  usage: 'afk <reason/sebep>',
  async execute(client, message, args) {
    const reason = args.join(' ') || 'Sebep belirtilmedi.';
    const existing = await Afk.findOne({ userId: message.author.id });
	
	const sender = new messageSender(message);
    if (existing) return sender.reply(sender.errorEmbed('Zaten AFK modundasın.'));
    

    await Afk.create({
      userId: message.author.id,
      reason,
    });

    sender.reply(sender.classic(`Artık AFK modundasın. Sebep: **${reason}**`));
  }
};
