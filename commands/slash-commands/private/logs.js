import { SlashCommandBuilder } from 'discord.js';
import { ModLogConfig } from '#models';
import { messageSender } from '#helpers';
import { PermissionsManager } from '#managers';

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

  async execute(interaction) {
    const sender = new messageSender(interaction);
    const PM = new PermissionsManager(interaction);
	
    const ctrl = await PM.control(PM.flags.Administrator);
    if (!ctrl) return interaction.reply({ content: '❌ Bu komutu kullanmak için yetkin yok.', ephemeral: true });

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
      'command': 'Komut',
      'joinLeave': 'Join/Leave',
      'message': 'Mesaj',
      'voice': 'Ses',
      'kickBan': 'Kick/Ban',
      'role': 'Rol',
      'channel': 'Kanal',
      'moderation': 'Mod'
    };
	
	if (option === 'showset') {
		
	  const embed = sender.embed({
		author: { name: interaction.guild.name, iconURL: interaction.guild.iconURL() },
		title: "Mod-Log Ayarları",
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
		`
	  }); 
	  return sender.reply(embed, true);
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

    for (const key in logFields) {
      if (option === `set-${key}`) {
        if (!kanal) return interaction.reply({ content: '❌ Lütfen bir kanal belirtin.', ephemeral: true });
        config.logs[key] = kanal.id;
        return saveAndReply(`${logFields[key]} log kanalı ${kanal} olarak ayarlandı.`);
      }
      if (option === `reset-${key}`) {
        config.logs[key] = null;
        return saveAndReply(`${logFields[key]} log kanalı sıfırlandı.`);
      }
    }

    return interaction.reply({ content: '❌ Geçersiz seçenek.', ephemeral: true });
  }
};
