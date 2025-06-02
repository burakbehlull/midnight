import { Afk } from '#models';

export default {
  name: 'afk',
  description: 'AFK moduna geçersin.',
  async execute(client, message, args) {
    const reason = args.join(' ') || 'Sebep belirtilmedi.';
    const existing = await Afk.findOne({ userId: message.author.id });

    if (existing) {
      return message.reply('Zaten AFK modundasın.');
    }

    await Afk.create({
      userId: message.author.id,
      reason,
    });

    message.reply(`Artık AFK modundasın. Sebep: **${reason}**`);
  }
};
