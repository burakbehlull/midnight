import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { ModLogConfig } from '#models';
import Manager from '#managers';

export default {
  data: new SlashCommandBuilder()
    .setName('modlog')
    .setDescription('Mod-log ayarlarını yap.')
    .addStringOption(opt =>
      opt.setName('seçenek')
        .setDescription('Yapılacak işlem')
        .setRequired(true)
        .addChoices(
		  { name: "Ayarları Göster", value: "showset" },

          { name: 'Log Sistemini Aç/Kapat', value: 'toggle-general' },
		  
          { name: 'Genel Log Kanalı Ayarla', value: 'set-general' },
          { name: 'Genel Log Kanalı Sıfırla', value: 'reset-general' },

          { name: 'Komut Log Ayarla', value: 'set-command' },
          { name: 'Komut Log Sıfırla', value: 'reset-command' },

          { name: 'Join/Leave Log Ayarla', value: 'set-joinleave' },
          { name: 'Join/Leave Log Sıfırla', value: 'reset-joinleave' },

          { name: 'Mesaj Log Ayarla', value: 'set-message' },
          { name: 'Mesaj Log Sıfırla', value: 'reset-message' },

          { name: 'Ses Log Ayarla', value: 'set-voice' },
          { name: 'Ses Log Sıfırla', value: 'reset-voice' },

          { name: 'Kick/Ban Log Ayarla', value: 'set-kickban' },
          { name: 'Kick/Ban Log Sıfırla', value: 'reset-kickban' },

          { name: 'Rol Log Ayarla', value: 'set-role' },
          { name: 'Rol Log Sıfırla', value: 'reset-role' },

          { name: 'Kanal Log Ayarla', value: 'set-channel' },
          { name: 'Kanal Log Sıfırla', value: 'reset-channel' },

          { name: 'Mod Log Ayarla', value: 'set-moderation' },
          { name: 'Mod Log Sıfırla', value: 'reset-moderation' },
        )
    )
    .addChannelOption(opt =>
      opt.setName('kanal')
        .setDescription('Ayarlanacak log kanalı')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('durum')
        .setDescription('Genel log sistemi durumu (aç/kapat)')
        .addChoices(
          { name: 'Aç', value: 'aç' },
          { name: 'Kapat', value: 'kapat' }
        )
        .setRequired(false)
    ),
  description: 'Log sistemini ayarlar',
  usage: '/logs <seçenekler> <aç/kapat> <#kanal>',
  category: 'server',
  permissions: {
    authorities: [PermissionFlagsBits.Administrator],
  },

  async execute(client, interaction) {
    const manager = new Manager(client, { action: interaction });
	
    const guildId = interaction.guild.id;
    const option = interaction.options.getString('seçenek');
    const kanal = interaction.options.getChannel('kanal');
    const durum = interaction.options.getString('durum');

    let config = await ModLogConfig.findOne({ guildId });
	  if (!config) config = new ModLogConfig({ guildId });

    const saveAndReply = async (msg) => {
      await config.save();
      return interaction.reply({ content: msg, ephemeral: true });
    };

   const logFields = {
      'command': { key: 'command', label: 'Komut' },
      'joinleave': { key: 'joinLeave', label: 'Join/Leave' },
      'message': { key: 'message', label: 'Mesaj' },
      'voice': { key: 'voice', label: 'Ses' },
      'kickban': { key: 'kickBan', label: 'Kick/Ban' },
      'role': { key: 'role', label: 'Rol' },
      'channel': { key: 'channel', label: 'Kanal' },
      'moderation': { key: 'moderation', label: 'Mod' }
    };
	
	  if (option === 'showset') {
    const theme = await manager.theme.embedThemeBuilder('success', {
      action: true,
      title: "Mod-Log Ayarları",
      author: manager.theme.getNameAndAvatars("guild", interaction),
      description: `
        Genel Log Sistemi: **${config?.modLogStatus ? "Açık" : "Kapalı"}**

        Genel Log Kanalı: ${config?.generalLogChannel ? `<#${config?.generalLogChannel}>` : "Yok"}

        Komut Log Kanalı: ${config?.logs.command ? `<#${config?.logs.command}>` : "Yok"}
        Katıl/Çık Log Kanalı: ${config?.logs.joinLeave ? `<#${config?.logs.joinLeave}>` : "Yok"}
        Mesaj Log Kanalı: ${config?.logs.message ? `<#${config?.logs.message}>` : "Yok"}
        Ses Log Kanalı: ${config?.logs.voice ? `<#${config?.logs.voice}>` : "Yok"}
        Kick/Ban Log Kanalı: ${config?.logs.kickBan ? `<#${config?.logs.kickBan}>` : "Yok"}
        Rol Log Kanalı: ${config?.logs.role ? `<#${config?.logs.role}>` : "Yok"}
        Kanal Log Kanalı: ${config?.logs.channel ? `<#${config?.logs.channel}>` : "Yok"}
        Moderasyon Log Kanalı: ${config?.logs.moderation ? `<#${config?.logs.moderation}>` : "Yok"}
      `,
      footer: manager.theme.getNameAndAvatars("user", interaction), 
    })
	  return theme.reply({ephemeral: true});
	  }

    if (option === 'set-general') {
      if (!kanal) return interaction.reply({ content: '❌ Lütfen bir kanal belirtin.', ephemeral: true });
      config.generalLogChannel = kanal.id;
      return saveAndReply(`Genel log kanalı ${kanal} olarak ayarlandı.`);
    }

    if (option === 'reset-general') {
      config.generalLogChannel = null;
      return saveAndReply('Genel log kanalı sıfırlandı.');
    }

    if (option === 'toggle-general') {
      if (!durum) return interaction.reply({ content: '❌ Lütfen aç/kapat belirtin.', ephemeral: true });
      const state = durum === 'aç';
      config.modLogStatus = state;
      return saveAndReply(`Genel log sistemi **${state ? 'açıldı' : 'kapatıldı'}**.`);
    }

    for (const [optKey, data] of Object.entries(logFields)) {
      if (option === `set-${optKey}`) {
        if (!kanal) return interaction.reply({ content: '❌ Lütfen bir kanal belirtin.', ephemeral: true });
        
        config.logs[data.key] = kanal.id; 
        return saveAndReply(`${data.label} log kanalı ${kanal} olarak ayarlandı.`);
      }

      if (option === `reset-${optKey}`) {
        config.logs[data.key] = null;
        return saveAndReply(`${data.label} log kanalı sıfırlandı.`);
      }
    }

    return interaction.reply({ content: '❌ Geçersiz seçenek.', ephemeral: true });
  }
};
