import Manager from "#managers";
import { cosmeticsHelper } from "#helpers";

export default {
  name: 'use',
  description: 'Kişisel tema ve kozmetik seçimlerini yönetir.',
  aliases: ['kozmetik', 'tema', 'temaayarla'],
  usage: 'use <modül> <tema/id/default> — örn: use spotify light | use spotify 6 | use spotify default | use spotify (listeler)',
  category: 'general',

  permissions: {
    enabled: false,
  },
  cooldown: 3,

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const userId = message.author?.id ?? message.member?.id;

    if (!userId) {
      return manager.sender.reply(manager.sender.errorEmbed('Kullanıcı kimliğin algılanamadı.'));
    }

    const raw = (args || []).map(a => String(a));
    const moduleInput = raw.shift();
    const variantInput = raw.length ? raw.join(' ').trim() : null;

    if (!moduleInput) {
      const lines = [];
      lines.push('**Kullanım:**');
      lines.push('• `k!use <modül>` — o modül için mevcut temaları listeler');
      lines.push('• `k!use <modül> <slug / ID / default>` — temayı aktif eder');
      lines.push('');
      lines.push('**Örnekler:**');
      lines.push('• `k!use spotify` → spotify temalarını listeler');
      lines.push('• `k!use spotify light` → spotify light temasını açar (envanterinde olmalı)');
      lines.push('• `k!use spotify 6` → spotify #6 idli temayı açar');
      lines.push('• `k!use spotify default` → spotify varsayılan temaya döner');
      lines.push('');
      lines.push('**Mevcut Modüller:**');
      lines.push('• `spotify` — 🎧 Spotify kart temaları');
      return manager.sender.reply(manager.sender.embed({
        title: 'Tema Komutu',
        color: 'Aqua',
        description: lines.join('\n')
      }));
    }

    const moduleKey = String(moduleInput).toLowerCase();

    if (!variantInput) {
      const list = await cosmeticsHelper.listAvailableCosmetics(userId, moduleKey);
      const meta = cosmeticsHelper.getModuleMeta(moduleKey);
      if (!list.length) {
        return manager.sender.reply(manager.sender.errorEmbed(`\`${moduleKey}\` için henüz tema/kozmetik bulunmuyor.`));
      }
      const lines = list.map(it => {
        const mark = it.active ? '✅' : (it.owned ? '🔓' : '🔒');
        const idLine = it.isDefault ? '(ücretsiz)' : `(id:${it.id}${it.price ? `, fiyat:${it.price}₵` : ''}${it.count && it.count > 0 ? `, envanter:${it.count}x` : ''})`;
        return `${mark} **${it.name}** [\`${it.slug}\`] ${idLine}${it.active ? ' — aktif' : ''}`;
      });
      const e = manager.sender.embed({
        title: `${meta.emoji} ${meta.label} Temaları`,
        color: 'Green',
        description: lines.join('\n') + `\n\nKullanmak için: \`.use ${moduleKey} <slug/id>\` veya \`.use ${moduleKey} default\``
      });
      return manager.sender.reply(e);
    }

    const res = await cosmeticsHelper.setActiveCosmetic(userId, moduleKey, variantInput);
    const embed = res.ok
      ? (res.changed === false ? manager.sender.classic(res.message) : manager.sender.classic(res.message))
      : manager.sender.errorEmbed(res.message);
    return manager.sender.reply(embed);
  }
};
