import { EmbedBuilder, SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import Manager from '#managers';
import { hybridReply } from '#helpers';

export default {
  name: 'banner',
  description: 'Etiketlenen kullanıcının veya kendi bannerını gösterir.',
  usage: 'banner @kullanıcı',
  aliases: ['bnr', 'ban'],
  category: 'user',
  permissions: {
    enabled: false
  },
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Kullanıcının bannerını gösterir.')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Kullanıcı (boş = kendin)').setRequired(false)
    )
    .setIntegrationTypes([
      ApplicationIntegrationType.UserInstall
    ])
    .setContexts([
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ]),

  async execute(client, ctx, options) {
    const manager = new Manager(client, { action: ctx });

    let rawUser;
    if (options?.user) {
      rawUser = options.user;
    } else if (ctx.mentions?.users?.first()) {
      rawUser = ctx.mentions.users.first();
    } else {
      rawUser = ctx.user || ctx.author;
    }
    const user = rawUser?.user ?? rawUser;
    if (!user) {
      return manager.sender.reply(manager.sender.errorEmbed('❌ Kullanıcı bulunamadı.'));
    }

    try {
      const userId = user.id;
      const fetchedUser = await client.users.fetch(userId, { force: true });
      const bannerURL = fetchedUser.bannerURL({ size: 1024 });

      const fetchUserId = fetchedUser.id;

      if (!bannerURL) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Kullanıcının bir bannerı yok.'));
      }

      const username = fetchedUser.username || 'Kullanıcı';
      const avatarUrl = fetchedUser.displayAvatarURL?.() || '';

      const embed = manager.sender.embed({
        title: `${username} - Banner`,
        footer: { text: `${username} (${fetchUserId})`, iconURL: avatarUrl || undefined }
      })
        .setImage(bannerURL)
        .setDescription(
          `**[PNG](${bannerURL.replace(/\.(webp|png|jpg|gif)/, '.png')}) | [JPG](${bannerURL.replace(/\.(webp|png|jpg|gif)/, '.jpg')}) | [WEBP](${bannerURL.replace(/\.(webp|png|jpg|gif)/, '.webp')})${bannerURL.includes('.gif') || fetchedUser.banner?.startsWith('a_') ? ` | [GIF](${bannerURL.replace(/\.(webp|png|jpg|gif)/, '.gif')})` : ''}**`
        );

      return hybridReply(ctx, { embeds: [embed] });

    } catch (err) {
      console.error('Banner komutu hatası:', err);
      return manager.sender.reply(manager.sender.errorEmbed('❌ Banner alınırken bir hata oluştu.'));
    }
  }
};
