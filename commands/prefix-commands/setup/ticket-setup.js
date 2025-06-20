import { messageSender, Button } from '#helpers';
import { PermissionsManager } from '#managers';

export default {
  name: 'ticket-setup',
  description: 'Ticket sistemi kurar',
  cooldown: 10,
  category: 'server',
  async execute(client, message, args) {
    const sender = new messageSender(message);
	const PM = new PermissionsManager(message);

    const ctrl = await PM.control(PM.flags.Administrator);
    if (!ctrl) return sender.reply(sender.errorEmbed('❌ Bu komutu kullanmak için yeterli yetkin yok.'));
      
    const btn = new Button();
    btn.add('ticket:create', '🎫 Ticket Aç', btn.style.Primary);

    const embed = sender.embed({
      title: 'Destek Sistemi',
      description: 'Aşağıdaki butona tıklayarak destek talebi oluşturabilirsiniz.',
    });

	await message.channel.send({ embeds: [embed], components: [btn.build()] });
  },
};
