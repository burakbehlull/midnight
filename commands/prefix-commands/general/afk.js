import { Afk } from '#models';
import Manager from '#managers';

export default {
  name: 'afk',
  description: 'AFK moduna geçersin.',
  usage: 'afk <reason/sebep>',
  moderation: 'user',
  permissions: {
    enabled: false
  },
  async execute(client, message, args) {
    const reason = args.join(' ') || 'Sebep belirtilmedi.';
    const existing = await Afk.findOne({ userId: message.author.id });
	
	const manager = new Manager(client, { action: message });
    if (existing) return manager.sender.reply(manager.sender.errorEmbed('Zaten AFK modundasın.'));
    

    await Afk.create({
      userId: message.author.id,
      reason,
    });

    manager.sender.reply(manager.sender.classic(`Artık AFK modundasın. Sebep: **${reason}**`));
  }
};
