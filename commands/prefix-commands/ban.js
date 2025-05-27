import { PermissionsManager } from '../../managers/index.js';

export default {
  name: 'ban',
  description: 'Kullanıcıyı banlar. m!ban @kullanıcı sebep veya m!ban kullanıcıID sebep',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);
	  
      const ctrl = await PM.control(PM.flags.BanMembers, PM.flags.Administrator)
	  if (!ctrl) return message.reply('❌ Bu komutu kullanmak için yetkin yok.');

      const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
      const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi.';

      if (!target) {
        return message.reply('❌ Banlanacak kullanıcıyı etiketlemeli veya ID girmelisin.');
      }

      if (!target.bannable) {
        return message.reply('❌ Bu kullanıcıyı banlayamıyorum. Rolü benden yüksek olabilir.');
      }

      await target.ban({ reason });
      message.reply(`✅ ${target.user.tag} banlandı. Sebep: ${reason}`);
    } catch (err) {
      console.error('Ban komutu hatası: ', err);
      message.reply('❌ Bir hata oluştu. Konsola bak.');
    }
  }
};
