import { SlashCommandBuilder } from 'discord.js';
import { Settings } from '#models';
import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Sunucu ayarlarını yap.')
    .addStringOption(opt =>
      opt.setName('seçenek')
        .setDescription('Bot sunucu ayarları')
        .setRequired(true)
        .addChoices(
		  { name: 'Hepsini Göster', value: 'allshow' },
          { name: 'Tag', value: 'tag' },
          { name: 'Yetkiler', value: 'yetkiler' },
          { name: 'Vip', value: 'vip' },
          { name: 'Streamer', value: 'streamer' },
          { name: 'Oto Rol', value: 'otorol' },
          { name: 'Oto Rol Aç/Kapat', value: 'otorolstatus' },
          { name: 'Erkek Kayıt Rolü', value: 'erkek' },
          { name: 'Kız Kayıt Rolü', value: 'kiz' },
          { name: 'Kayıtsız Rolü', value: 'kayitsiz' },
          { name: 'Davet Log Kanalı', value: 'invitelogchannel' },
          { name: 'Davet Sistemi Aç/Kapat', value: 'invitelogstatus' },
          { name: 'Level Sistemi Aç/Kapat', value: 'levelsystemstatus' },
          { name: 'Stat Sistemi Aç/Kapat', value: 'statsystemstatus' },
          { name: 'Tüm sistemleri Aç/Kapat', value: 'allsystem' },
        )
    )
    
	.addStringOption((option) =>
      option
        .setName("değer")
        .setDescription("Yetkiler için aç/kapat.")
        .setRequired(false)
        .addChoices(
			{name: "Aç", value: "aç"},
			{name: "Kapat", value: "kapat"}
        )
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
    )
	.addChannelOption(opt =>
		opt.setName('kanal')
		.setDescription('Log kanalını seçin')
		.setRequired(false)
	),

  async execute(interaction) {
    const PM = new PermissionsManager(interaction);
    const sender = new messageSender(interaction);
    const ctrl = await PM.control(PM.flags.Administrator);
    if (!ctrl) return interaction.reply({ content: '❌ Bu komutu kullanmak için yetkin yok.', ephemeral: true });

	const option = interaction.options.getString('seçenek');
    const stringValue = interaction.options.getString('değer');
    const role = interaction.options.getRole('rol');
    const user = interaction.options.getUser('kullanıcı');
	const channel = interaction.options.getChannel('kanal');


    const guildId = interaction.guild.id;
    let settings = await Settings.findOne({ guildId });
    if (!settings) settings = new Settings({ guildId });

	if (option === 'allshow') {
		const embed = sender.embed({
			author: { name: interaction.guild.name, iconURL: interaction.guild.iconURL() },
			title: "Sunucu Ayarları",
			description: `
				Tag: **${settings.tag || "Yok"}**
				Vip Role: **${settings.vipRoleId ? `<@!${settings.vipRoleId}>` : "Yok"}**
				Streamer Rol: **${settings.streamerRoleId ? `<@${settings.streamerRoleId}>` : "Yok"}**
				Erkek Rolü: **${settings.erkekRoleId ? `<@!${settings.erkekRoleId}>` : "Yok"}**
				Kız Rolü: **${settings.kizRoleId ? `<@!${settings.kizRoleId}>` : "Yok"}**
				Kayıtsız Rolü: **${settings.kayitsizRoleId ? `<@!${settings.kayitsizRoleId}>` : "Yok"}**
				
				Otorol Rolü: **${settings.autoRoleId ? `<@!${settings.autoRoleId}>` : "Yok"}**
				Otorol Sistemi: **${settings.otorolStatus ? "Açık" : "Kapalı"}**
				
				Davet Kanalı: **${settings.inviteLogChannelId ? `<#${settings.inviteLogChannelId}>` : "Yok"}**
				Davet Sistemi: **${settings.inviteLogStatus ? "Açık" : "Kapalı"}**
				
				Seviye Sistemi: **${settings.levelSystemStatus ? "Açık" : "Kapalı"}**
				Stat Sistemi: **${settings.statSystemStatus ? "Açık" : "Kapalı"}**
			`
		})
		return sender.reply(embed, true);
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
