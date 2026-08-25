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
    const guildId = message.guild?.id;
    if (!guildId) return;

    const existing = await Afk.findOne({ userId: message.author.id, guildId });

    const manager = new Manager(client, { action: message });
    if (existing) return manager.sender.reply(manager.sender.errorEmbed('Zaten bu sunucuda AFK modundasın.'));

    const member = message.member;
    const originalNickname = member?.nickname ?? null;

    const displayName = message.author.globalName ?? message.author.username;
    const newNickname = `[AFK] ${displayName}`;

    try {
      if (member && member.manageable) {
        await member.setNickname(newNickname, 'AFK moduna geçildi');
      }
    } catch (err) {
      console.error('[AFK] Nickname değiştirilemedi:', err);
    }

    try {
      await Afk.findOneAndUpdate(
        { userId: message.author.id, guildId },
        { userId: message.author.id, guildId, reason, originalNickname },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      if (err?.code === 11000) {
        return manager.sender.reply(manager.sender.errorEmbed('Sunucuda AFK kaydın zaten var, bir sorun oluştuysa tekrar dene.'));
      }
      console.error('[AFK] Kayıt hatası:', err);
      return manager.sender.reply(manager.sender.errorEmbed('AFK kaydı oluşturulurken bir hata oluştu.'));
    }

    const reasonText = reason ? ` Sebep: **${reason}**` : '';
    manager.sender.reply(manager.sender.classic(`**[AFK] ${displayName}** artık AFK modunda.${reasonText}`));
  }
};
