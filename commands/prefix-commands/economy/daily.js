import Manager from '#managers';
import { Economy } from '#models';

export default {
  name: 'daily',
  description: 'Günlük para alırsın.',
  aliases: [],
  usage: '.daily',
  category: 'economy',

  permissions: {
    enabled: false
  },

  async execute(client, message) {
    const manager = new Manager(client, { action: message });

    const userId = message.author.id;
    const now = new Date();

    const user = await Economy.findOneAndUpdate(
      { userId },
      {},
      { new: true, upsert: true }
    );

    const cooldown = 1000 * 60 * 60 * 24;
    const last = new Date(user.cooldowns.daily);

    if (now - last < cooldown) {
      const remaining = Math.ceil((cooldown - (now - last)) / 1000 / 60 / 60);
      return manager.sender.reply(manager.sender.errorEmbed(`❌ ${remaining} saat sonra tekrar deneyebilirsin.`));
    }

    let reward = Math.floor(Math.random() * (1000 - 200 + 1)) + 200;

    if (user.hearts >= 100) reward += 35;
    if (user.cookies >= 200) reward += 60;
    if (user.marriedTo) reward += 100;

    user.money += reward;
    user.cooldowns.daily = now;
    user.xp += 10;

    await user.save();
	  const name = message.author.globalName || message.author.username

    manager.sender.reply(manager.sender.successEmbed(`**${name}**, bugünkü ödülün: **__${reward}__** para!`));
  }
};
