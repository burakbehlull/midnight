import { Button } from '#helpers';
import Manager from '#managers';

export default {
  name: 'ticket-setup',
  description: 'Ticket sistemi kurar',
  cooldown: 10,
  category: 'server',
  async execute(client, message, args) {

    const manager = new Manager(client, {
      action: message
    });

    const btn = new Button();
    btn.add('ticket:create', '🎫 Ticket Aç', btn.style.Primary);

    const embed = manager.sender.embed({
      title: 'Destek Sistemi',
      description: 'Aşağıdaki butona tıklayarak destek talebi oluşturabilirsiniz.',
    });

	await message.channel.send({ embeds: [embed], components: [btn.build()] });
  },
};
