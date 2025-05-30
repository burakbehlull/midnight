import { PermissionsManager } from '../../managers/index.js';
import { SlashCommandBuilder } from 'discord.js';
import Settings from '../../models/Settings.js';


export default {
  data: new SlashCommandBuilder()
    .setName('set')
    .setDescription('Sunucu ayarlarını yap.')
    .addStringOption(opt =>
      opt.setName('seçenek')
        .setDescription('Tag, Yetkiler, Vip, Streamer')
        .setRequired(true)
        .addChoices(
          { name: 'Tag', value: 'tag' },
          { name: 'Yetkiler', value: 'yetkiler' },
          { name: 'Vip', value: 'vip' },
          { name: 'Streamer', value: 'streamer' }
        )
    )
    .addStringOption(opt =>
      opt.setName('değer')
        .setDescription('Tag için string, yetkiler için aç/kapat yaz.')
        .setRequired(false)
    )
    .addRoleOption(opt =>
      opt.setName('rol')
        .setDescription('Vip veya Streamer için rol seç')
        .setRequired(false)
    ),

  async execute(interaction) {
	  
	const PM = new PermissionsManager(interaction);  
    const ctrl = await PM.control(PM.flags.Administrator)
	if (!ctrl) return message.reply('❌ Bu komutu kullanmak için yetkin yok.');
	  
    const option = interaction.options.getString('seçenek');
    const stringValue = interaction.options.getString('değer');
    const roleValue = interaction.options.getRole('rol');

    const guildId = interaction.guild.id;
    let settings = await Settings.findOne({ guildId });
    if (!settings) settings = new Settings({ guildId });

    // İşleme başla
    if (option === 'tag') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir tag girin.', ephemeral: true });
      settings.tag = stringValue;
      await settings.save();
      return interaction.reply({ content: `Tag başarıyla **${stringValue}** olarak ayarlandı.`, ephemeral: true });
    }

    if (option === 'yetkiler') {
      if (!stringValue || !['aç', 'kapat'].includes(stringValue.toLowerCase()))
        return interaction.reply({ content: '❌ "aç" veya "kapat" şeklinde belirtmelisin.', ephemeral: true });

      settings.yetkiler = stringValue.toLowerCase() === 'aç';
      await settings.save();
      return interaction.reply({ content: `Yetkiler **${stringValue.toUpperCase()}** olarak ayarlandı.`, ephemeral: true });
    }

    if (option === 'vip') {
      if (!roleValue) return interaction.reply({ content: '❌ Lütfen bir rol belirt.', ephemeral: true });
      settings.vipRoleId = roleValue.id;
      await settings.save();
      return interaction.reply({ content: `VIP rolü ${roleValue} olarak ayarlandı.`, ephemeral: true });
    }

    if (option === 'streamer') {
      if (!roleValue) return interaction.reply({ content: '❌ Lütfen bir rol belirt.', ephemeral: true });
      settings.streamerRoleId = roleValue.id;
      await settings.save();
      return interaction.reply({ content: `Streamer rolü ${roleValue} olarak ayarlandı.`, ephemeral: true });
    }

    return interaction.reply({ content: '❌ Geçersiz işlem.', ephemeral: true });
  }
};
