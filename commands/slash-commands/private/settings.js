import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Settings } from '#models';
import Manager from '#managers';

export default {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Sunucu ayarlarını yap.')
    .addSubcommand(sub =>
      sub
        .setName('allshow')
        .setDescription('Tum sunucu ayarlarini goster')
    )
    .addSubcommand(sub =>
      sub
        .setName('prefix')
        .setDescription('Sunucu prefixini ayarla')
        .addStringOption(option =>
          option
            .setName("değer")
            .setDescription("Prefix degeri (ornek: !)")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('tag')
        .setDescription('Tag ayarla')
        .addStringOption(option =>
          option
            .setName("değer")
            .setDescription("Tag degeri")
            .setRequired(true)
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('roles')
        .setDescription('Rol bazli ayarlar')
        .addSubcommand(sub =>
          sub
            .setName('vip')
            .setDescription('Vip Rol Ayarla')
            .addRoleOption(opt => opt.setName('rol').setDescription('Vip, Streamer veya güvenli rolü').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('photo')
            .setDescription('Photo Rol Ayarla')
            .addRoleOption(opt => opt.setName('rol').setDescription('Vip, Streamer veya güvenli rolü').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('streamer')
            .setDescription('Streamer Rol Ayarla')
            .addRoleOption(opt => opt.setName('rol').setDescription('Vip, Streamer veya güvenli rolü').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('erkek')
            .setDescription('Erkek Kayit Rol Ayarla')
            .addRoleOption(opt => opt.setName('rol').setDescription('Vip, Streamer veya güvenli rolü').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('kiz')
            .setDescription('Kiz Kayit Rol Ayarla')
            .addRoleOption(opt => opt.setName('rol').setDescription('Vip, Streamer veya güvenli rolü').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('kayitsiz')
            .setDescription('Kayitsiz Rol Ayarla')
            .addRoleOption(opt => opt.setName('rol').setDescription('Vip, Streamer veya güvenli rolü').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('staffrole')
            .setDescription('Staff Rol Ayarla')
            .addRoleOption(opt => opt.setName('rol').setDescription('Vip, Streamer veya güvenli rolü').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('jailrole')
            .setDescription('Jail Rol Ayarla')
            .addRoleOption(opt => opt.setName('rol').setDescription('Vip, Streamer veya güvenli rolü').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('otorol')
            .setDescription('Oto Rol Ayarla')
            .addRoleOption(opt => opt.setName('rol').setDescription('Vip, Streamer veya güvenli rolü').setRequired(true))
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('channels')
        .setDescription('Kanal bazli ayarlar')
        .addSubcommand(sub =>
          sub
            .setName('invitelogchannel')
            .setDescription('Davet Log Kanal Ayarla')
            .addChannelOption(opt => opt.setName('kanal').setDescription('Log kanalını seçin').setRequired(true))
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('system')
        .setDescription('Sistem ac/kapat islemleri')
        .addSubcommand(sub =>
          sub
            .setName('allsystem')
            .setDescription('Tum sistemleri Ac/Kapat')
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
            .setName('otorolstatus')
            .setDescription('Oto Rol Sistemini Ac/Kapat')
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
            .setName('invitelogstatus')
            .setDescription('Davet Sistemini Ac/Kapat')
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
            .setName('levelsystemstatus')
            .setDescription('Level Sistemini Ac/Kapat')
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
            .setName('statsystemstatus')
            .setDescription('Stat Sistemini Ac/Kapat')
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
   description: 'Sunucu sistemini ayarlar',
   usage: '/settings <subcommand> <değer|rol|kanal>',
   category: 'server',
    permissions: {
      authorities: [PermissionFlagsBits.Administrator],
    },

  async execute(client,interaction) {
    const manager = new Manager(client, { action: interaction });
    
    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    let option = null;
    let stringValue = null;
    let role = null;
    let user = null;
    let channel = null;

    if (subcommandGroup === null) {
      if (subcommand === 'allshow') option = 'allshow';
      if (subcommand === 'prefix') {
        option = 'prefix';
        stringValue = interaction.options.getString('değer');
      }
      if (subcommand === 'tag') {
        option = 'tag';
        stringValue = interaction.options.getString('değer');
      }
    }

    if (subcommandGroup === 'roles') {
      role = interaction.options.getRole('rol');
      option = subcommand;
    }

    if (subcommandGroup === 'channels') {
      channel = interaction.options.getChannel('kanal');
      option = subcommand;
    }

    if (subcommandGroup === 'system') {
      stringValue = interaction.options.getString('değer');
      option = subcommand;
    }

    const guildId = interaction.guild.id;
    let settings = await Settings.findOne({ guildId });
    if (!settings) settings = new Settings({ guildId });

	  if (option === 'allshow') {
      
      const theme = await manager.theme.embedThemeBuilder(manager.theme.themes.rich, {
          action: true,
          title: "Sunucu Ayarları",
          author: manager.theme.getNameAndAvatars("guild", interaction),
          description: `
          Prefix: **${settings.prefix || process.env.PREFIX || "Yok"}**
          Tag: **${settings.tag || "Yok"}**
          Vip Role: **${settings.vipRoleId ? `<@!${settings.vipRoleId}>` : "Yok"}**
          Photo Role: **${settings.photoRoleId ? `<@!${settings.photoRoleId}>` : "Yok"}**
          Streamer Rol: **${settings.streamerRoleId ? `<@${settings.streamerRoleId}>` : "Yok"}**
          
          Yetkili Rolü: **${settings.staffRole ? `<@!${settings.staffRole}>` : "Yok"}**
          Jail Rolü: **${settings.jailRoleId ? `<@!${settings.jailRoleId}>` : "Yok"}**
          Erkek Rolü: **${settings.erkekRoleId ? `<@!${settings.erkekRoleId}>` : "Yok"}**
          Kız Rolü: **${settings.kizRoleId ? `<@!${settings.kizRoleId}>` : "Yok"}**
          Kayıtsız Rolü: **${settings.kayitsizRoleId ? `<@!${settings.kayitsizRoleId}>` : "Yok"}**
          
          Otorol Rolü: **${settings.autoRoleId ? `<@!${settings.autoRoleId}>` : "Yok"}**
          Otorol Sistemi: **${settings.otorolStatus ? "Açık" : "Kapalı"}**
          
          Davet Kanalı: **${settings.inviteLogChannelId ? `<#${settings.inviteLogChannelId}>` : "Yok"}**
          Davet Sistemi: **${settings.inviteLogStatus ? "Açık" : "Kapalı"}**
          
          Seviye Sistemi: **${settings.levelSystemStatus ? "Açık" : "Kapalı"}**
          Stat Sistemi: **${settings.statSystemStatus ? "Açık" : "Kapalı"}**
        `,
        footer: manager.theme.getNameAndAvatars("user", interaction), 
      })
		  return theme.reply({ephemeral: true});
	} 
	
	if (option === 'allsystem') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir değer girin.', ephemeral: true });
      const mode = stringValue.toLowerCase() === 'aç';
	  settings.otorolStatus = mode;
	  settings.levelSystemStatus = mode;
	  settings.statSystemStatus = mode;
	  settings.inviteLogStatus = mode;
      await settings.save();
      return interaction.reply({ content: `Sistemler başarıyla **${mode ? "açık" : "kapalı"}** olarak ayarlandı.`, ephemeral: true });
    }

    if (option === 'prefix') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir prefix girin.', ephemeral: true });
      settings.prefix = stringValue;
      await settings.save();
      return interaction.reply({ content: `Prefix başarıyla **${stringValue}** olarak ayarlandı.`, ephemeral: true });
    }

    if (option === 'tag') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir tag girin.', ephemeral: true });
      settings.tag = stringValue;
      await settings.save();
      return interaction.reply({ content: `Tag başarıyla **${stringValue}** olarak ayarlandı.`, ephemeral: true });
    }

    if (option === 'vip') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirt.', ephemeral: true });
      settings.vipRoleId = role.id;
      await settings.save();
      return interaction.reply({ content: `VIP rolü ${role} olarak ayarlandı.`, ephemeral: true });
    }

    if (option === 'photo') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirt.', ephemeral: true });
      settings.photoRoleId = role.id;
      await settings.save();
      return interaction.reply({ content: `Photo rolü ${role} olarak ayarlandı.`, ephemeral: true });
    }

    if (option === 'streamer') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirt.', ephemeral: true });
      settings.streamerRoleId = role.id;
      await settings.save();
      return interaction.reply({ content: `Streamer rolü ${role} olarak ayarlandı.`, ephemeral: true });
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
	
	if (option === 'staffrole') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirtin.', ephemeral: true });
      settings.staffRole = role.id;
      await settings.save();
      return interaction.reply({ content: `Yetkili rolü başarıyla ${role} olarak ayarlandı.`, ephemeral: true });
    }
	
	if (option === 'jailrole') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirtin.', ephemeral: true });
      settings.jailRoleId = role.id;
      await settings.save();
      return interaction.reply({ content: `Jail rolü başarıyla ${role} olarak ayarlandı.`, ephemeral: true });
    }

	if (option === 'invitelogchannel') {
	  if(!settings.inviteLogStatus) return interaction.reply({ content: '❌ Lütfen önce davet kanalını ayarlayınız.', ephemeral: true });
     
      if (!channel) return interaction.reply({ content: '❌ Lütfen bir kanal belirtin.', ephemeral: true });
      settings.inviteLogChannelId = channel.id;
      await settings.save();
      return interaction.reply({ content: `Davet kanalı başarıyla ${channel} olarak ayarlandı.`, ephemeral: true });
    }
	
	if (option === 'invitelogstatus') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir değer (aç/kapat) belirtin.', ephemeral: true });
      
	  const mode = stringValue.toLowerCase() === 'aç';
	  settings.inviteLogStatus = mode;
	  
      await settings.save();
      return interaction.reply({ content: `Davet sistemi başarıyla ${mode ? "açık" : "kapalı"} olarak ayarlandı.`, ephemeral: true });
    }
	
	if (option === 'otorol') {
	  if(!settings.otorolStatus) return interaction.reply({ content: '❌ Lütfen önce otorol rolünü ayarlayınız.', ephemeral: true });
     
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirtin.', ephemeral: true });
      settings.autoRoleId = role.id;
      await settings.save();
      return interaction.reply({ content: `Otorol başarıyla ${role} olarak ayarlandı.`, ephemeral: true });
    }
	
	if (option === 'otorolstatus') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir değer (aç/kapat) belirtin.', ephemeral: true });
      
	  const mode = stringValue.toLowerCase() === 'aç';
	  settings.otorolStatus = mode;
	  
      await settings.save();
      return interaction.reply({ content: `Otorol sistemi başarıyla ${mode ? "açık" : "kapalı"} olarak ayarlandı.`, ephemeral: true });
    }
	
	if (option === 'levelsystemstatus') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir değer (aç/kapat) belirtin.', ephemeral: true });
      
	  const mode = stringValue.toLowerCase() === 'aç';
	  settings.levelSystemStatus = mode;
	  
      await settings.save();
      return interaction.reply({ content: `Seviye sistemi başarıyla ${mode ? "açık" : "kapalı"} olarak ayarlandı.`, ephemeral: true });
    }
	
	if (option === 'statsystemstatus') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir değer (aç/kapat) belirtin.', ephemeral: true });
      
	  const mode = stringValue.toLowerCase() === 'aç';
	  settings.statSystemStatus = mode;
	  
      await settings.save();
      return interaction.reply({ content: `Stat sistemi başarıyla ${mode ? "açık" : "kapalı"} olarak ayarlandı.`, ephemeral: true });
    }
	
	
    return interaction.reply({ content: '❌ Geçersiz işlem.', ephemeral: true });
  }
};
