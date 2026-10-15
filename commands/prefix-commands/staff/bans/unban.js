import Manager from '#managers';
import { ForceBan, Punishment } from '#models';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'unban',
  description: 'Belirtilen ID\'ye sahip kullanıcının banını kaldırır.',
  usage: 'unban <userId>',
  category: 'bans',
  permissions: {
      authorities: [PermissionFlagsBits.BanMembers, PermissionFlagsBits.Administrator],
  },
  
  async execute(client, message, args) {
    const sender = new Manager(client, { action: message }).sender;
  
    const userId = args[0];
    const guild = message.guild;

    if (!userId) {
      return sender.reply(sender.errorEmbed("❌ Lütfen bir kullanıcı ID'si belirtin."));
    }

    try {
      const forceBanRecord = await ForceBan.findOne({ userId, guildId: guild.id });

      if (forceBanRecord && forceBanRecord.banType !== 'ban' && forceBanRecord.banType !== 'massban') {
        const banTypeNames = {
          'forceban': 'Force Ban (unforceban ile açılabilir)',
          'godban': 'God Ban (ungodban ile açılabilir)',
        };
        const correctCommand = forceBanRecord.banType === 'forceban' ? 'unforceban' : 'ungodban';
        
        return sender.reply(sender.errorEmbed(
          `❌ **Bu ban türünü sadece ilgili komut ile açabilirsin!**\n\n` +
          `**Ban Türü:** ${banTypeNames[forceBanRecord.banType] || forceBanRecord.banType}\n` +
          `**Doğru Komut:** \`.${correctCommand} ${userId}\`\n\n` +
          `💡 Normal ban ve massban **unban** ile açılabilir.`
        ));
      }

      await guild.bans.remove(userId);

      if (forceBanRecord) {
        await ForceBan.deleteOne({ userId, guildId: guild.id });
      }

      await Punishment.updateMany(
        {
          userId: userId,
          guildId: guild.id,
          type: { $in: ['ban', 'massban'] },
          active: true
        },
        {
          $set: {
            active: false,
            removedAt: new Date(),
            removedBy: message.author.id
          }
        }
      );

      await sender.reply(sender.classic(`✅ <@${userId}> adlı kullanıcının banı kaldırıldı.`));
    } catch (err) {
      console.error('[unban] Ban kaldırma hatası:', err);
      await sender.reply(sender.errorEmbed('❌ Kullanıcının banı kaldırılırken bir hata oluştu!'));
    }
  }
};
