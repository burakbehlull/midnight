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

    let user;
    if (options?.user) {
      user = options.user;
    } else if (ctx.mentions?.users?.first()) {
      user = ctx.mentions.users.first();
    } else {
      user = ctx.user || ctx.author;
    }

    try {
      const fetchedUser = await client.users.fetch(user.id, { force: true });
      const bannerURL = fetchedUser.bannerURL({ size: 1024 });

      if (!bannerURL) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Kullanıcının bir bannerı yok.'));
      }

      const embed = new EmbedBuilder(manager.sender.embed({
        title: `${fetchedUser.username} - Banner`,
        footer: { text: fetchedUser.username, iconURL: fetchedUser.displayAvatarURL() }
      }))
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
