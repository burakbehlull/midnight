import { SlashCommandBuilder } from 'discord.js';
import { GuildPermission } from '#models';
import { PermissionsManager } from '#managers';
import { messageSender } from '#helpers';

export default {
  data: new SlashCommandBuilder()
    .setName('authority')
    .setDescription('Yetki ayarlarını yap.')
    .addStringOption(opt =>
      opt.setName('seçenek')
        .setDescription('Bot sunucu yetki ayarları')
        .setRequired(true)
        .addChoices(
          { name: "Ayarlananlar", value: "showset" },
          { name: 'Güvenli Kullanıcı Ekle', value: 'safeuseradd' },
          { name: 'Güvenli Kullanıcı Çıkar', value: 'safeuserremove' },
          { name: 'Güvenli Rol Ekle', value: 'saferoleadd' },
          { name: 'Güvenli Rol Çıkar', value: 'saferoleremove' },
          { name: 'Güvenli Kullanıcı Sistemi Aç/Kapat', value: 'safeuserstatus' },
          { name: 'Belirlenmiş Yetkileri Sistemini Aç/Kapat', value: 'safechoosenstatus' },
          { name: 'Güvenli Rol Sistemi Aç/Kapat', value: 'saferolestatus' },
          { name: 'Güvenli Yetkileri Aç/Kapat', value: 'safesystemstatus' },
        )
    )
    .addStringOption(option =>
      option
        .setName("değer")
        .setDescription("Yetkiler için aç/kapat.")
        .setRequired(false)
        .addChoices(
          { name: "Aç", value: "aç" },
          { name: "Kapat", value: "kapat" }
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

    const guildId = interaction.guild.id;
    let guildPermission = await GuildPermission.findOne({ guildId });
    if (!guildPermission) guildPermission = new GuildPermission({ guildId });
	/*
	const owner = await PM.isGuildOwner()
	
	if(!owner) return interaction.reply({
        content: "❌ Bu komutu sadece sunucu sahibi kullanabilir!",
        ephemeral: true
    });
	*/

    if (option === 'showset') {
      const embed = sender.embed({
        author: { name: interaction.guild.name, iconURL: interaction.guild.iconURL() },
        title: "Sunucu Ayarları",
        description: `
          Güvenli Kişiler Sistemi: **${guildPermission.isOwners ? "Açık" : "Kapalı"}**
          Güvenli Roller Sistemi: **${guildPermission.isRole ? "Açık" : "Kapalı"}**
          Komutlara Göre Belirlenmiş Yetki Sistemi: **${guildPermission.isAuthority ? "Açık" : "Kapalı"}**
          
          Güvenli Roller: **${guildPermission.roles.length > 0 ? guildPermission.roles.map(item => `<@&${item}>`).join(', ') : "Yok"}**
          Güvenli Kullanıcılar: **${guildPermission.owners.length > 0 ? guildPermission.owners.map(item => `<@${item}>`).join(', ') : "Yok"}**
        `
      });
      return sender.reply(embed, true);
    }

    if (option === 'safeuseradd') {
      if (!user) return interaction.reply({ content: '❌ Lütfen bir kullanıcı belirtin.', ephemeral: true });
      if (!guildPermission.owners.includes(user.id)) guildPermission.owners.push(user.id); // DÜZELTİLDİ: ')' silindi
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
      if (!guildPermission.roles.includes(role.id)) guildPermission.roles.push(role.id); // DÜZELTİLDİ: ')' silindi
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