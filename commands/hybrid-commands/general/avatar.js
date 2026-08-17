import { EmbedBuilder, SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import Manager from '#managers';
import { hybridReply } from '#helpers';

export default {
  name: 'avatar',
  description: 'Etiketlenen kullanıcının veya kendi avatarını gösterir.',
  usage: 'avatar @kullanıcı',
  aliases: ['av', 'pp', 'pfp'],
  category: 'user',
  permissions: {
    enabled: false
  },
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Kullanıcının avatarını göterir.')
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
      const embed = new EmbedBuilder(manager.sender.embed({
        title: `${user.username} - Avatar`,
        footer: { text: user.username, iconURL: user.displayAvatarURL() }
      }))
        .setDescription(
          `**[PNG](${user.displayAvatarURL({ extension: 'png', size: 1024 })}) | [JPG](${user.displayAvatarURL({ extension: 'jpg', size: 1024 })}) | [WEBP](${user.displayAvatarURL({ extension: 'webp', size: 1024 })})${user.avatar?.startsWith('a_') ? ` | [GIF](${user.displayAvatarURL({ extension: 'gif', size: 1024 })})` : ''}**`
        )
        .setImage(user.displayAvatarURL({ size: 1024 }));

      return hybridReply(ctx, { embeds: [embed] });
    } catch (err) {
      console.error('Avatar komutu hatası:', err);
      return manager.sender.reply(manager.sender.errorEmbed('❌ Avatar alınırken bir hata oluştu.'));
    }
  }
};
