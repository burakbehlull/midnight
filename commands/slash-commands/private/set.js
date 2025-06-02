import { SlashCommandBuilder } from 'discord.js';
import { Settings } from '#models';
import { PermissionsManager } from '#managers';

export default {
  data: new SlashCommandBuilder()
    .setName('set')
    .setDescription('Sunucu ayarlarını yap.')
    .addStringOption(opt =>
      opt.setName('seçenek')
        .setDescription('Tag, Yetkiler, Vip, Streamer, GüvenliEkle')
        .setRequired(true)
        .addChoices(
          { name: 'Tag', value: 'tag' },
          { name: 'Yetkiler', value: 'yetkiler' },
          { name: 'Vip', value: 'vip' },
          { name: 'Streamer', value: 'streamer' },
          { name: 'Oto Rol', value: 'otorol' },
          { name: 'Erkek Kayıt Rolü', value: 'erkek' },
          { name: 'Kız Kayıt Rolü', value: 'kiz' },
          { name: 'Kayıtsız Rolü', value: 'kayitsiz' },
        )
    )
    .addStringOption(opt =>
      opt.setName('değer')
        .setDescription('Tag için string, yetkiler için aç/kapat.')
        .setRequired(false)
    )
    .addRoleOption(opt =>
      opt.setName('rol')
        .setDescription('Vip, Streamer veya güvenli rolü')
        .setRequired(false)
    )
    .addUserOption(opt =>
      opt.setName('kullanıcı')
        .setDescription('Güvenli kullanıcı')
        .setRequired(false)
    ),

  async execute(interaction) {
    const PM = new PermissionsManager(interaction);
    const ctrl = await PM.control(PM.flags.Administrator);
    if (!ctrl) return interaction.reply({ content: '❌ Bu komutu kullanmak için yetkin yok.', ephemeral: true });

    const option = interaction.options.getString('seçenek');
    const stringValue = interaction.options.getString('değer');
    const role = interaction.options.getRole('rol');
    const user = interaction.options.getUser('kullanıcı');

    const guildId = interaction.guild.id;
    let settings = await Settings.findOne({ guildId });
    if (!settings) settings = new Settings({ guildId });

    if (option === 'tag') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir tag girin.', ephemeral: true });
      settings.tag = stringValue;
      await settings.save();
      return interaction.reply({ content: `Tag başarıyla **${stringValue}** olarak ayarlandı.`, ephemeral: true });
    }

    if (option === 'yetkiler') {
      if (!stringValue || !['aç', 'kapat'].includes(stringValue.toLowerCase())) {
        return interaction.reply({ content: '❌ "aç" veya "kapat" şeklinde belirtmelisin.', ephemeral: true });
      }

      const mode = stringValue.toLowerCase() === 'aç';
      settings.isAuthority = mode;
      settings.isOwners = mode;
      settings.isRole = mode;
      await settings.save();
      return interaction.reply({ content: `Tüm yetkiler **${stringValue.toUpperCase()}** olarak ayarlandı.`, ephemeral: true });
    }

    if (option === 'vip') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirt.', ephemeral: true });
      settings.vipRoleId = role.id;
      await settings.save();
      return interaction.reply({ content: `VIP rolü ${role} olarak ayarlandı.`, ephemeral: true });
    }

    if (option === 'streamer') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirt.', ephemeral: true });
      settings.streamerRoleId = role.id;
      await settings.save();
      return interaction.reply({ content: `Streamer rolü ${role} olarak ayarlandı.`, ephemeral: true });
    }

    if (option === 'otorol') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirtin.', ephemeral: true });
      settings.autoRoleId = role.id;
      await settings.save();
      return interaction.reply({ content: `Otorol başarıyla ${role} olarak ayarlandı.`, ephemeral: true });
    }
	
	if (option === 'erkek') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirtin.', ephemeral: true });
      settings.erkekRoleId = role.id;
      await settings.save();
      return interaction.reply({ content: `Erkek kayıt rolü başarıyla ${role} olarak ayarlandı.`, ephemeral: true });
    }
	
	if (option === 'kiz') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirtin.', ephemeral: true });
      settings.kizRoleId = role.id;
      await settings.save();
      return interaction.reply({ content: `Kız kayıt rolü başarıyla ${role} olarak ayarlandı.`, ephemeral: true });
    }
	
	if (option === 'kayitsiz') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirtin.', ephemeral: true });
      settings.kayitsizRoleId = role.id;
      await settings.save();
      return interaction.reply({ content: `Kayıtsız rolü başarıyla ${role} olarak ayarlandı.`, ephemeral: true });
    }

    return interaction.reply({ content: '❌ Geçersiz işlem.', ephemeral: true });
  }
};
