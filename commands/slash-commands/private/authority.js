import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { GuildPermission } from '#models';
import Manager from '#managers';

export default {
  data: new SlashCommandBuilder()
    .setName('authority')
    .setDescription('Yetki ayarlarını yap.')
    .addSubcommand(sub =>
      sub
        .setName('showset')
        .setDescription('Ayarlanan yetki ve guvenli listeleri goster')
    )
    .addSubcommandGroup(group =>
      group
        .setName('user')
        .setDescription('Guvenli kullanici islemleri')
        .addSubcommand(sub =>
          sub
            .setName('add')
            .setDescription('Guvenli Kullanici Ekle')
            .addUserOption(opt => opt.setName('kullanıcı').setDescription('Güvenli kullanıcı').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Guvenli Kullanici Cikar')
            .addUserOption(opt => opt.setName('kullanıcı').setDescription('Güvenli kullanıcı').setRequired(true))
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('role')
        .setDescription('Guvenli rol islemleri')
        .addSubcommand(sub =>
          sub
            .setName('add')
            .setDescription('Guvenli Rol Ekle')
            .addRoleOption(opt => opt.setName('rol').setDescription('Vip, Streamer veya güvenli rolü').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Guvenli Rol Cikar')
            .addRoleOption(opt => opt.setName('rol').setDescription('Vip, Streamer veya güvenli rolü').setRequired(true))
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('system')
        .setDescription('Guvenli sistem ac/kapat islemleri')
        .addSubcommand(sub =>
          sub
            .setName('safeuserstatus')
            .setDescription('Guvenli Kullanici Sistemini Ac/Kapat')
            .addStringOption(option =>
              option
                .setName("değer")
                .setDescription("Yetkiler için aç/kapat.")
                .setRequired(true)
                .addChoices(
                  { name: "Aç", value: "aç" },
                  { name: "Kapat", value: "kapat" }
                )
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('saferolestatus')
            .setDescription('Guvenli Rol Sistemini Ac/Kapat')
            .addStringOption(option =>
              option
                .setName("değer")
                .setDescription("Yetkiler için aç/kapat.")
                .setRequired(true)
                .addChoices(
                  { name: "Aç", value: "aç" },
                  { name: "Kapat", value: "kapat" }
                )
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('safechoosenstatus')
            .setDescription('Belirlenmis Yetkileri Sistemini Ac/Kapat')
            .addStringOption(option =>
              option
                .setName("değer")
                .setDescription("Yetkiler için aç/kapat.")
                .setRequired(true)
                .addChoices(
                  { name: "Aç", value: "aç" },
                  { name: "Kapat", value: "kapat" }
                )
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('safesystemstatus')
            .setDescription('Tum Guvenli Yetkileri Ac/Kapat')
            .addStringOption(option =>
              option
                .setName("değer")
                .setDescription("Yetkiler için aç/kapat.")
                .setRequired(true)
                .addChoices(
                  { name: "Aç", value: "aç" },
                  { name: "Kapat", value: "kapat" }
                )
            )
        )
    ),
   description: 'Sunucu yetki sistemini ayarlar',
   usage: '/authority <subcommand> <değer|rol|kullanıcı>',
   category: 'server',
   permissions: {
      authorities: [PermissionFlagsBits.Administrator],
    },

  async execute(client,interaction) {

    const manager = new Manager(client, { action: interaction })

    const ctrl = await manager.authority.checkOwnerAndBotOwners();
    if (!ctrl) return message.reply({ content: '❌ Bu komutu kullanmak owner olmalısın.', ephemeral: true });

    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    let option = null;
    let stringValue = null;
    let role = null;
    let user = null;

    if (subcommandGroup === null && subcommand === 'showset') {
      option = 'showset';
    }

    if (subcommandGroup === 'user') {
      user = interaction.options.getUser('kullanıcı');
      if (subcommand === 'add') option = 'safeuseradd';
      if (subcommand === 'remove') option = 'safeuserremove';
    }

    if (subcommandGroup === 'role') {
      role = interaction.options.getRole('rol');
      if (subcommand === 'add') option = 'saferoleadd';
      if (subcommand === 'remove') option = 'saferoleremove';
    }

    if (subcommandGroup === 'system') {
      stringValue = interaction.options.getString('değer');
      option = subcommand;
    }

    const guildId = interaction.guild.id;
    let guildPermission = await GuildPermission.findOne({ guildId });
    if (!guildPermission) guildPermission = new GuildPermission({ guildId });

    if (option === 'showset') {

    const theme = await manager.theme.embedThemeBuilder(manager.theme.themes.rich, {
        action: true,
        title: "Sunucu Ayarları",
        author: manager.theme.getNameAndAvatars("guild", interaction),
        description: `
          Güvenli Kişiler Sistemi: **${guildPermission.isOwners ? "Açık" : "Kapalı"}**
          Güvenli Roller Sistemi: **${guildPermission.isRole ? "Açık" : "Kapalı"}**
          Komutlara Göre Belirlenmiş Yetki Sistemi: **${guildPermission.isAuthority ? "Açık" : "Kapalı"}**
          
          Güvenli Roller: **${guildPermission.roles.length > 0 ? guildPermission.roles.map(item => `<@&${item}>`).join(', ') : "Yok"}**
          Güvenli Kullanıcılar: **${guildPermission.owners.length > 0 ? guildPermission.owners.map(item => `<@${item}>`).join(', ') : "Yok"}**
        `,
        footer: manager.theme.getNameAndAvatars("user", interaction), 
    })
    return await theme.reply({ ephemeral:true })

    }

    if (option === 'safeuseradd') {
      if (!user) return interaction.reply({ content: '❌ Lütfen bir kullanıcı belirtin.', ephemeral: true });
      if (!guildPermission.owners.includes(user.id)) guildPermission.owners.push(user.id);
      await guildPermission.save();
      return interaction.reply({ content: `${user} güvenli kullanıcı olarak eklendi.`, ephemeral: true });
    }

    if (option === 'safeuserremove') {
      if (!user) return interaction.reply({ content: '❌ Lütfen bir kullanıcı belirtin.', ephemeral: true });
      guildPermission.owners = guildPermission.owners.filter(u => u !== user.id);
      await guildPermission.save();
      return interaction.reply({ content: `${user} güvenli kullanıcılardan çıkarıldı.`, ephemeral: true });
    }

    if (option === 'saferoleadd') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirtin.', ephemeral: true });
      if (!guildPermission.roles.includes(role.id)) guildPermission.roles.push(role.id);
      await guildPermission.save();
      return interaction.reply({ content: `${role} güvenli rol olarak eklendi.`, ephemeral: true });
    }

    if (option === 'saferoleremove') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirtin.', ephemeral: true });
      guildPermission.roles = guildPermission.roles.filter(r => r !== role.id);
      await guildPermission.save();
      return interaction.reply({ content: `${role} güvenli rollerden çıkarıldı.`, ephemeral: true });
    }

    if (option === 'safeuserstatus') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir değer (aç/kapat) belirtin.', ephemeral: true });
      const mode = stringValue.toLowerCase() === 'aç';
      guildPermission.isOwners = mode;
      await guildPermission.save();
      return interaction.reply({ content: `Güvenli kullanıcı sistemi ${mode ? 'açıldı' : 'kapatıldı'}.`, ephemeral: true });
    }

    if (option === 'saferolestatus') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir değer (aç/kapat) belirtin.', ephemeral: true });
      const mode = stringValue.toLowerCase() === 'aç';
      guildPermission.isRole = mode;
      await guildPermission.save();
      return interaction.reply({ content: `Güvenli rol sistemi ${mode ? 'açıldı' : 'kapatıldı'}.`, ephemeral: true });
    }

    if (option === 'safechoosenstatus') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir değer (aç/kapat) belirtin.', ephemeral: true });
      const mode = stringValue.toLowerCase() === 'aç';
      guildPermission.isAuthority = mode;
      await guildPermission.save();
      return interaction.reply({ content: `Komuta göre seçilmiş yetki sistemi ${mode ? 'açıldı' : 'kapatıldı'}.`, ephemeral: true });
    }

    if (option === 'safesystemstatus') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir değer (aç/kapat) belirtin.', ephemeral: true });
      const mode = stringValue.toLowerCase() === 'aç';
      guildPermission.isOwners = mode;
      guildPermission.isRole = mode;
      guildPermission.isAuthority = mode;
      await guildPermission.save();
      return interaction.reply({ content: `Tüm güvenli sistemler ${mode ? 'açıldı' : 'kapatıldı'}.`, ephemeral: true });
    }

    return interaction.reply({ content: '❌ Geçersiz işlem.', ephemeral: true });
  }
};
