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
    const reason = args.join(' ') || null;
    const existing = await Afk.findOne({ userId: message.author.id });

	const manager = new Manager(client, { action: message });
    if (existing) return manager.sender.reply(manager.sender.errorEmbed('Zaten AFK modundasın.'));

    await Afk.create({
      userId: message.author.id,
      reason,
    });

    const displayName = message.author.globalName ?? message.author.username;
    const reasonText = reason ? ` Sebep: **${reason}**` : '';
    manager.sender.reply(manager.sender.classic(`**[AFK] ${displayName}** artık AFK modunda.${reasonText}`));
  }
};
