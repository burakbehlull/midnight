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
            .setName('singleregister')
            .setDescription('Tek Rol Kayıt Modu İçin Kayıt Rol Ayarla')
            .addRoleOption(opt => opt.setName('rol').setDescription('Kayıt olan herkese verilecek tek rol').setRequired(true))
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
        .addSubcommand(sub =>
          sub
            .setName('spotifymatchchannel')
            .setDescription('Spotify Eşleşme Kanal Ayarla')
            .addChannelOption(opt => opt.setName('kanal').setDescription('Eşleşme mesajlarının atılacağı kanal').setRequired(true))
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
        .addSubcommand(sub =>
          sub
            .setName('tagrole')
            .setDescription('Tag Role Sistemini Ac/Kapat')
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
            .setName('spotifymatchstatus')
            .setDescription('Spotify Eşleşme Sistemini Ac/Kapat')
            .addStringOption(option =>
              option
                .setName("değer")
                .setDescription("Spotify eşleşme sistemi için aç/kapat.")
                .setRequired(true)
                .addChoices(
                  { name: "Aç", value: "aç" },
                  { name: "Kapat", value: "kapat" }
                )
            )
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('tagrole')
        .setDescription('Tag Role Sistemi Ayarlari')
        .addSubcommand(sub =>
          sub
            .setName('set')
            .setDescription('Tag alanlar için verilecek rolu ayarla')
            .addRoleOption(opt => opt.setName('rol').setDescription('Tag alanlara verilecek rol').setRequired(true))
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('registerformat')
        .setDescription('Kayıt isim formatını seç (İsim Yaş / Tag İsim Yaş / İsim / Tag İsim)')
        .addStringOption(option =>
          option
            .setName("format")
            .setDescription("Kayıt formatını seçin")
            .setRequired(true)
            .addChoices(
              { name: "Hiçbiri (İsim değiştirme, sadece rol ver)", value: "none" },
              { name: "İsim Yaş (örn: Ahmet | 18)", value: "isim_yas" },
              { name: "Tag İsim Yaş (örn: ✦ Ahmet I 18)", value: "tag_isim_yas" },
              { name: "İsim (örn: Ahmet)", value: "isim" },
              { name: "Tag İsim (örn: ✦ Ahmet)", value: "tag_isim" }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('registermode')
        .setDescription('Kayıt modunu seç (Cinsiyet Rolleri / Tek Rol)')
        .addStringOption(option =>
          option
            .setName("mod")
            .setDescription("Kayıt modunu seçin")
            .setRequired(true)
            .addChoices(
              { name: "Cinsiyet Rolleri (Erkek / Kız 2 buton)", value: "gender" },
              { name: "Tek Rol (Sadece 1 buton / tek rol)", value: "single" }
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
      if (subcommand === 'registerformat') {
        option = 'registerformat';
        stringValue = interaction.options.getString('format');
      }
      if (subcommand === 'registermode') {
        option = 'registermode';
        stringValue = interaction.options.getString('mod');
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

    if (subcommandGroup === 'tagrole') {
      if (subcommand === 'set') {
        role = interaction.options.getRole('rol');
      }
      option = `tagrole_${subcommand}`;
    }

    const guildId = interaction.guild.id;
    let settings = await Settings.findOne({ guildId });
    if (!settings) settings = new Settings({ guildId });

	  if (option === 'allshow') {
      const formatText = {
        'none': 'Hiçbiri (İsim değiştirme, sadece rol ver)',
        'isim_yas': 'İsim Yaş (Ahmet | 18)',
        'tag_isim_yas': 'Tag İsim Yaş (✦ Ahmet I 18)',
        'isim': 'İsim (Ahmet)',
        'tag_isim': 'Tag İsim (✦ Ahmet)'
      }[settings.registerFormat] || '❌ Ayarlanmamış (/settings registerformat)';

      const modeText = {
        'gender': 'Cinsiyet Rolleri (Erkek / Kız 2 buton)',
        'single': 'Tek Rol (1 buton)'
      }[settings.registerMode || 'gender'];

      const theme = await manager.theme.embedThemeBuilder(manager.theme.themes.rich, {
          action: true,
          title: "Sunucu Ayarları",
          author: manager.theme.getNameAndAvatars("guild", interaction),
          description: `
          Prefix: **${settings.prefix || process.env.PREFIX || "Yok"}**
          Tag: **${settings.tag || "Yok"}**
          Kayıt Formatı: **${formatText}**
          Kayıt Modu: **${modeText}**
          Vip Role: **${settings.vipRoleId ? `<@!${settings.vipRoleId}>` : "Yok"}**
          Photo Role: **${settings.photoRoleId ? `<@!${settings.photoRoleId}>` : "Yok"}**
          Streamer Rol: **${settings.streamerRoleId ? `<@${settings.streamerRoleId}>` : "Yok"}**
          
          Yetkili Rolü: **${settings.staffRole ? `<@!${settings.staffRole}>` : "Yok"}**
          Jail Rolü: **${settings.jailRoleId ? `<@!${settings.jailRoleId}>` : "Yok"}**
          Erkek Rolü: **${settings.erkekRoleId ? `<@!${settings.erkekRoleId}>` : "Yok"}**
          Kız Rolü: **${settings.kizRoleId ? `<@!${settings.kizRoleId}>` : "Yok"}**
          Tek Kayıt Rolü: **${settings.singleRegisterRoleId ? `<@!${settings.singleRegisterRoleId}>` : "Yok"}**
          Kayıtsız Rolü: **${settings.kayitsizRoleId ? `<@!${settings.kayitsizRoleId}>` : "Yok"}**
          
          Otorol Rolü: **${settings.autoRoleId ? `<@!${settings.autoRoleId}>` : "Yok"}**
          Otorol Sistemi: **${settings.otorolStatus ? "Açık" : "Kapalı"}**
          
          Davet Kanalı: **${settings.inviteLogChannelId ? `<#${settings.inviteLogChannelId}>` : "Yok"}**
          Davet Sistemi: **${settings.inviteLogStatus ? "Açık" : "Kapalı"}**
          
          Seviye Sistemi: **${settings.levelSystemStatus ? "Açık" : "Kapalı"}**
          Stat Sistemi: **${settings.statSystemStatus ? "Açık" : "Kapalı"}**
          
          Tag Role Sistemi: **${settings.tagRoleStatus ? "Açık" : "Kapalı"}**
          Tag Role: **${settings.tagRoleId ? `<@&${settings.tagRoleId}>` : "Yok"}**
          
          Spotify Eşleşme Sistemi: **${settings.spotifyMatchEnabled ? "Açık" : "Kapalı"}**
          Spotify Eşleşme Kanalı: **${settings.spotifyMatchChannelId ? `<#${settings.spotifyMatchChannelId}>` : "Yok"}**
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

	if (option === 'singleregister') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirtin.', ephemeral: true });
      settings.singleRegisterRoleId = role.id;
      await settings.save();
      return interaction.reply({ content: `Tek Kayıt rolü (Tek Rol modu için) başarıyla ${role} olarak ayarlandı. Artık Tek Rol modunda kayıt olan herkese bu rol verilecek.`, ephemeral: true });
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
	
	if (option === 'tagrole') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir değer (aç/kapat) belirtin.', ephemeral: true });
      
	  const mode = stringValue.toLowerCase() === 'aç';
	  settings.tagRoleStatus = mode;
	  
      await settings.save();
      return interaction.reply({ content: `Tag Role sistemi başarıyla ${mode ? "açık" : "kapalı"} olarak ayarlandı.`, ephemeral: true });
    }
	
	if (option === 'tagrole_set') {
      if (!role) return interaction.reply({ content: '❌ Lütfen bir rol belirtin.', ephemeral: true });
      settings.tagRoleId = role.id;
      await settings.save();
      return interaction.reply({ content: `Tag Role başarıyla ${role} olarak ayarlandı. Artık sunucu tag'ını alan kullanıcılara otomatik bu rol verilecek.`, ephemeral: true });
    }

	if (option === 'spotifymatchchannel') {
      if (!channel) return interaction.reply({ content: '❌ Lütfen bir kanal belirtin.', ephemeral: true });
      settings.spotifyMatchChannelId = channel.id;
      if (!settings.spotifyMatchEnabled) settings.spotifyMatchEnabled = true;
      await settings.save();
      return interaction.reply({ content: `Spotify eşleşme kanalı başarıyla ${channel} olarak ayarlandı. Sistem otomatik olarak **açıldı**.`, ephemeral: true });
    }

	if (option === 'spotifymatchstatus') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir değer (aç/kapat) belirtin.', ephemeral: true });
      const mode = stringValue.toLowerCase() === 'aç';
      settings.spotifyMatchEnabled = mode;
      await settings.save();
      let extra = '';
      if (mode && !settings.spotifyMatchChannelId) {
        extra = '\n\n⚠️ **Kanal ayarlanmamış!** Önce `/settings channels spotifymatchchannel` ile kanal ayarlayın.';
      }
      return interaction.reply({ content: `Spotify eşleşme sistemi başarıyla ${mode ? "açık" : "kapalı"} olarak ayarlandı.${extra}`, ephemeral: true });
    }

    if (option === 'registerformat') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir format seçin.', ephemeral: true });

      const formatLabel = {
        'none': 'Hiçbiri (İsim değiştirme, sadece rol ver)',
        'isim_yas': 'İsim Yaş (Ahmet | 18)',
        'tag_isim_yas': 'Tag İsim Yaş (✦ Ahmet I 18)',
        'isim': 'İsim (Ahmet)',
        'tag_isim': 'Tag İsim (✦ Ahmet)'
      }[stringValue];

      if (stringValue !== 'none' && (stringValue === 'tag_isim' || stringValue === 'tag_isim_yas')) {
        if (!settings.tag) {
          return interaction.reply({
            content: `⚠️ **${formatLabel}** formatı seçildi ama sunucuda **tag ayarlanmamış!**\n` +
                     `Önce /settings tag ile tag ayarlayın, sonra tekrar format seçin.`,
            ephemeral: true
          });
        }
      }

      settings.registerFormat = stringValue;
      await settings.save();

      let extra = '';
      if (stringValue === 'none') {
        extra = '\n\n📌 Bu formatta **isim değiştirilmeyecek**, sadece kayıt rolleri verilecektir.\nKullanım: `.k @kullanıcı` (isim/yaş gerekmez).';
      } else if (stringValue === 'isim' || stringValue === 'tag_isim') {
        extra = '\n\n📌 Bu formatta sadece **isim** yazılması yeterli olacak, **yaş** gerekmeyecek.';
      }

      return interaction.reply({
        content: `Kayıt formatı başarıyla **${formatLabel}** olarak ayarlandı.${extra}`,
        ephemeral: true
      });
    }

    if (option === 'registermode') {
      if (!stringValue) return interaction.reply({ content: '❌ Lütfen bir mod seçin.', ephemeral: true });

      const modeLabel = {
        'gender': 'Cinsiyet Rolleri (Erkek / Kız 2 buton)',
        'single': 'Tek Rol (Sadece 1 buton / tek kayıt rolü)'
      }[stringValue];

      let extra = '';
      if (stringValue === 'gender') {
        if (!settings.erkekRoleId || !settings.kizRoleId) {
          extra = '\n\n⚠️ Dikkat: Cinsiyet rolleri modu seçildi ama erkek/kız rolleri ayarlanmamış görünüyor.\n' +
                  'Önce `/settings roles erkek` ve `/settings roles kiz` ile ayarlayın.';
        }
      }
      if (stringValue === 'single') {
        if (!settings.singleRegisterRoleId) {
          extra = '\n\n⚠️ Dikkat: Tek Rol modu seçildi ama Tek Kayıt Rolü ayarlanmamış görünüyor.\n' +
                  'Önce `/settings roles singleregister` ile ayarlayın.';
        }
      }

      settings.registerMode = stringValue;
      await settings.save();

      return interaction.reply({
        content: `Kayıt modu başarıyla **${modeLabel}** olarak ayarlandı.${extra}`,
        ephemeral: true
      });
    }


    return interaction.reply({ content: '❌ Geçersiz işlem.', ephemeral: true });
  }
};
