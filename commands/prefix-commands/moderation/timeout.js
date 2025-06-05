import { messageSender } from '#helpers';
import { PermissionsManager } from '#managers';

import ms from 'ms';

export default {
  name: 'timeout',
  aliases: ['sustur'],
  description: 'Belirtilen kullanıcıyı süreli olarak susturur (timeout).',
  usage: 'timeout @kullanıcı <süre> [sebep]',
  
  async execute(client, message, args) {
    const sender = new messageSender(message);
	const PM = new PermissionsManager(message);
	

    const member = message.mentions.members.first();
    const duration = args[1];
    const reason = args.slice(2).join(' ') || 'Sebep belirtilmedi.';

	const ctrl = await PM.control(PM.flags.ModerateMembers, PM.flags.Administrator)
	if (!ctrl) return sender.reply(sender.errorEmbed("❌ Yetkin yok."));


    if (!member) return sender.reply(sender.errorEmbed('❌ Lütfen bir kullanıcı etiketle.'));
    

    if (!duration || !ms(duration)) return sender.reply(sender.errorEmbed('❌ Lütfen geçerli bir süre belirtin. Örneğin: `1h`, `30m`, `10s`.'));
    

    const msDuration = ms(duration);

    try {
      await member.timeout(msDuration, reason);
      return sender.reply(sender.classic(`${member} kullanıcısı ${duration} boyunca susturuldu.**Sebep:** ${reason}`));
    } catch (err) {
      console.error('Timeout hatası:', err);
      return sender.reply(sender.errorEmbed('❌ Kullanıcı susturulurken bir hata oluştu.'));
    }
  }
};
