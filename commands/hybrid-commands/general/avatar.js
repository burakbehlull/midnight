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

    const username = user.username || user.user?.username || 'Kullanıcı';
    const id = user.id || user.user?.id || 'Kullanıcı';
    const avatarUrl = user.displayAvatarURL?.({ size: 1024 }) || user.user?.displayAvatarURL?.({ size: 1024 }) || '';
    const hasAnimated = !!(user.avatar?.startsWith('a_') || user.user?.avatar?.startsWith('a_'));

    const getExt = (ext) => user.displayAvatarURL?.({ extension: ext, size: 1024 }) || user.user?.displayAvatarURL?.({ extension: ext, size: 1024 }) || '';

    try {
      const embed = manager.sender.embed({
        title: `${username} - Avatar`,
        footer: { text: `${username} (${id})`, iconURL: avatarUrl || undefined }
      })
        .setDescription(
          `**[PNG](${getExt('png')}) | [JPG](${getExt('jpg')}) | [WEBP](${getExt('webp')})${hasAnimated ? ` | [GIF](${getExt('gif')})` : ''}**`
        )
        .setImage(avatarUrl);

      return hybridReply(ctx, { embeds: [embed] });
    } catch (err) {
      console.error('Avatar komutu hatası:', err);
      return manager.sender.reply(manager.sender.errorEmbed('❌ Avatar alınırken bir hata oluştu.'));
    }
  }
};
