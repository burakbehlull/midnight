import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType
} from 'discord.js';
import { GuardCommandSettings } from '#models';

const GUARD_COMMAND_LIST = [
  { name: 'guard-user-info', label: 'guard-user-info', description: 'Kullanıcı guard profili sorgular', emoji: '🔍' },
  { name: 'yt', label: 'yt (yetki)', description: 'Sunucu yetkilerini aç/kapat', emoji: '🔐' },
  { name: 'backup', label: 'backup (yedek)', description: 'Sunucu yedekleme işlemleri', emoji: '💾' }
];

const COMMAND_MODE_OPTIONS = (current) => [
  { label: 'Kapalı', value: 'off', emoji: '➖', default: current === 'off' },
  { label: 'Whitelist', description: 'Sadece eklenenler kullanabilir', value: 'whitelist', emoji: '✅', default: current === 'whitelist' },
  { label: 'Blacklist', description: 'Eklenenler hariç herkes kullanabilir', value: 'blacklist', emoji: '⛔', default: current === 'blacklist' }
];

export default {
  name: 'guard-panel',
  aliases: ['gpanel', 'guard'],
  description: 'Guard ayar panelini açar',
  noPermissionCheck: true,
  permissions: {
    authorities: [PermissionFlagsBits.Administrator],
    user: [],
    roles: []
  },

  async execute(client, message, args = []) {
    try {
      const guild = message.guild;
      const member = message.member;

      if (!client.permissionsManager) {
        return await message.reply('❌ Guard sistemi henüz yüklenmedi!');
      }

      const isOwner = await client.permissionsManager.isOwner(guild.id, member.id);
      if (!isOwner && !member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await message.reply('❌ Bu komutu kullanmak için yetkiniz yok!');
      }

      const embed = await this.createMainPanelEmbed(client, guild.id);
      const components = await this.createMainPanelComponents(client, guild.id);

      await message.reply({ embeds: [embed], components });

    } catch (error) {
      console.error('Guard panel hatası:', error);
      await message.reply('❌ Bir hata oluştu!').catch(() => {});
    }
  },

  async createMainPanelEmbed(client, guildId) {
    const settings = await client.permissionsManager.getGuildSettings(guildId);
    const guild = client.guilds.cache.get(guildId);

    const safeUsers = settings.safeguard.safeUsers.length;
    const safeRoles = settings.safeguard.safeRoles.length;
    const allowedBots = settings.safeguard.allowedBots.length;
    const whitelistBots = settings.safeguard.whitelistBots.length;
    const protectedRoles = settings.protectedRoles.length;

    const backupInterval = settings.backup.interval / 1000 / 60 / 60; 
    const lastBackup = settings.backup.lastBackup 
      ? `<t:${Math.floor(settings.backup.lastBackup.getTime() / 1000)}:R>`
      : 'Henüz alınmadı';

    const guardsStatus = [
      `Rol Guard: ${settings.guards.roleGuard.create && settings.guards.roleGuard.delete && settings.guards.roleGuard.update ? '✅' : '❌'}`,
      `Kanal Guard: ${settings.guards.channelGuard.create && settings.guards.channelGuard.delete && settings.guards.channelGuard.update ? '✅' : '❌'}`,
      `Ban Guard: ${settings.guards.banGuard ? '✅' : '❌'}`,
      `Kick Guard: ${settings.guards.kickGuard ? '✅' : '❌'}`,
      `Rol Verme Guard: ${settings.guards.roleAssignGuard ? '✅' : '❌'}`,
      `Bot Guard: ${settings.guards.botGuard ? '✅' : '❌'}`,
      `Sunucu Güncelleme Guard: ${settings.guards.guildUpdateGuard ? '✅' : '❌'}`,
      `Vanity Guard: ${settings.guards.vanityGuard ? '✅' : '❌'}`,
      `Spam Guard: ${settings.guards.spamGuard ? '✅' : '❌'}`,
      `Reklam Guard: ${settings.guards.advertisementGuard ? '✅' : '❌'}`
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('🛡️ Guard Kontrol Paneli')
      .setDescription('Sunucu güvenlik ayarlarını buradan yönetebilirsiniz.')
      .addFields(
        {
          name: '📊 Durum',
          value: [
            `Safeguard: ${settings.safeguard.enabled ? '✅ Aktif' : '❌ Kapalı'}`,
            `Yetkiler: ${settings.permissionsLocked ? '🔒 Kilitli' : '🔓 Açık'}`,
            `Log Kanalı: ${settings.logChannel ? `<#${settings.logChannel}>` : '❌ Ayarlanmamış'}`
          ].join('\n'),
          inline: true
        },
        {
          name: '👥 Güvenlik',
          value: [
            `Güvenli Kullanıcı: ${safeUsers}`,
            `Güvenli Rol: ${safeRoles}`,
            `İzinli Bot: ${allowedBots}`,
            `Whitelist Bot: ${whitelistBots}`,
            `Korumalı Rol: ${protectedRoles}`,
            `Jail Rolü: ${settings.safeguard.jailRole ? `<@&${settings.safeguard.jailRole}>` : '❌'}`
          ].join('\n'),
          inline: true
        },
        {
          name: '💾 Backup',
          value: [
            `Durum: ${settings.backup.enabled ? '✅ Aktif' : '❌ Kapalı'}`,
            `Süre: ${backupInterval} saat`,
            `Son Backup: ${lastBackup}`
          ].join('\n'),
          inline: false
        },
        {
          name: '🛡️ Guard Durumları',
          value: guardsStatus,
          inline: false
        }
      )
      .setFooter({ text: guild.name, iconURL: guild.iconURL() })
      .setTimestamp();

    return embed;
  },

  async createMainPanelComponents(client, guildId) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('guard_main_menu')
      .setPlaceholder('Ayar kategorisi seçin...')
      .addOptions([
        {
          label: 'Güvenlik Ayarları',
          description: 'Güvenli kullanıcı, rol ve bot ayarları',
          value: 'security_settings',
          emoji: '🔒'
        },
        {
          label: 'Guard Ayarları',
          description: 'Guard türlerini aç/kapat',
          value: 'guard_settings',
          emoji: '🛡️'
        },
        {
          label: 'Limit Ayarları',
          description: 'İşlem limitlerini ayarla',
          value: 'limit_settings',
          emoji: '⏱️'
        },
        {
          label: 'Ceza Ayarları',
          description: 'Guard cezalarını özelleştir',
          value: 'punishment_settings',
          emoji: '⚔️'
        },
        {
          label: 'Backup Ayarları',
          description: 'Otomatik backup yapılandır',
          value: 'backup_settings',
          emoji: '💾'
        },
        {
          label: 'Log Ayarları',
          description: 'Log kanalını ayarla',
          value: 'log_settings',
          emoji: '📋'
        },
        {
          label: 'Komut Yetkileri',
          description: 'Komutların kullanıcı/rol yetkilerini ayarla',
          value: 'command_permissions',
          emoji: '🔑'
        },
        {
          label: 'Spam & Reklam Ayarları',
          description: 'Anti-spam ve anti-reklam eşikleri',
          value: 'antispam_settings',
          emoji: '🚨'
        }
      ]);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('guard_refresh')
        .setLabel('Yenile')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setCustomId('guard_toggle_all')
        .setLabel('Tüm Guardları Aç/Kapat')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🛡️'),
      new ButtonBuilder()
        .setCustomId('guard_emergency_lock')
        .setLabel('ACİL KİLİT')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

    return [row1, row2];
  },

  async handleInteraction(client, interaction) {
    const guild = interaction.guild;
    if (!guild) return;
    
    const { customId } = interaction;

    const deferActions = ['guard_main_menu', 'guard_refresh', 'back_to_main'];
    const shouldDefer = deferActions.includes(customId);

    if (shouldDefer && !interaction.deferred && !interaction.replied) {
      try {
        await interaction.deferUpdate();
      } catch (error) {
        return;
      }
    }

    if (customId === 'guard_main_menu') {
      const selected = interaction.values[0];
      
      if (selected === 'security_settings') {
        await this.showSecuritySettings(client, interaction, guild);
      } else if (selected === 'guard_settings') {
        await this.showGuardSettings(client, interaction, guild);
      } else if (selected === 'limit_settings') {
        await this.showLimitSettings(client, interaction, guild);
      } else if (selected === 'punishment_settings') {
        await this.showPunishmentSettings(client, interaction, guild);
      } else if (selected === 'backup_settings') {
        await this.showBackupSettings(client, interaction, guild);
      } else if (selected === 'log_settings') {
        await this.showLogSettings(client, interaction, guild);
      } else if (selected === 'command_permissions') {
        await this.showCommandPermissionList(client, interaction, guild);
      } else if (selected === 'antispam_settings') {
        await this.showAntiSpamSettings(client, interaction, guild);
      }
    }
    
    else if (customId === 'guard_refresh') {
      const embed = await this.createMainPanelEmbed(client, guild.id);
      const components = await this.createMainPanelComponents(client, guild.id);
      
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed], components });
      } else {
        await interaction.update({ embeds: [embed], components });
      }
    }
    
    else if (customId === 'guard_toggle_all') {
      const settings = await client.permissionsManager.getGuildSettings(guild.id);
      const allEnabled = settings.guards.roleGuard.create && settings.guards.channelGuard.delete;
      
      settings.guards.roleGuard.create = !allEnabled;
      settings.guards.roleGuard.delete = !allEnabled;
      settings.guards.roleGuard.update = !allEnabled;
      settings.guards.channelGuard.create = !allEnabled;
      settings.guards.channelGuard.delete = !allEnabled;
      settings.guards.channelGuard.update = !allEnabled;
      settings.guards.banGuard = !allEnabled;
      settings.guards.kickGuard = !allEnabled;
      settings.guards.roleAssignGuard = !allEnabled;
      settings.guards.botGuard = !allEnabled;
      settings.guards.guildUpdateGuard = !allEnabled;
      settings.guards.vanityGuard = !allEnabled;
      settings.guards.spamGuard = !allEnabled;
      settings.guards.advertisementGuard = !allEnabled;
      
      await settings.save();
      client.permissionsManager.updateCache(guild.id, settings);
      
      await interaction.reply({ 
        content: `✅ Tüm guardlar ${!allEnabled ? 'açıldı' : 'kapatıldı'}!`, 
        ephemeral: true 
      });
    }
    
    else if (customId === 'guard_emergency_lock') {
      const closedRoles = await client.permissionsManager.lockAllPermissions(guild);
      await interaction.reply({ 
        content: `🔒 **ACİL KİLİT AKTİF!**\n${closedRoles.length} rol yetkisi kapatıldı!`, 
        ephemeral: true 
      });
    }
    
    else if (customId === 'toggle_guard_select') {
      await this.handleGuardToggle(client, interaction, guild);
    }
    
    else if (customId === 'set_limit_select') {
      await this.handleLimitSet(client, interaction, guild);
    }
    
    else if (customId === 'set_punishment_select') {
      await this.handlePunishmentSet(client, interaction, guild);
    }
    
    else if (customId.startsWith('punishment_')) {
      const guardType = customId.replace('punishment_', '');
      const selectedPunishments = interaction.values;
      const settings = await client.permissionsManager.getGuildSettings(guild.id);
      
      settings.punishments[guardType].actions = selectedPunishments;
      await settings.save();
      client.permissionsManager.updateCache(guild.id, settings);
      
      await interaction.reply({ 
        content: `✅ **${guardType}** için cezalar ayarlandı:\n${selectedPunishments.map(p => `\`${p}\``).join(', ')}`, 
        ephemeral: true 
      });
    }
    
    else if (customId === 'toggle_safeguard') {
      const settings = await client.permissionsManager.getGuildSettings(guild.id);
      settings.safeguard.enabled = !settings.safeguard.enabled;
      await settings.save();
      client.permissionsManager.updateCache(guild.id, settings);
      
      await interaction.reply({ 
        content: `✅ Safeguard ${settings.safeguard.enabled ? 'açıldı' : 'kapatıldı'}!`, 
        ephemeral: true 
      });
    }
    else if (customId === 'add_safe_user') {
      await this.showAddSafeUserModal(interaction);
    }
    else if (customId === 'remove_safe_user') {
      await this.showRemoveSafeUserModal(interaction);
    }
    else if (customId === 'add_safe_role') {
      await this.showAddSafeRoleModal(interaction);
    }
    else if (customId === 'remove_safe_role') {
      await this.showRemoveSafeRoleModal(interaction);
    }
    else if (customId === 'add_allowed_bot') {
      await this.showAddAllowedBotModal(interaction);
    }
    else if (customId === 'remove_allowed_bot') {
      await this.showRemoveAllowedBotModal(interaction);
    }
    else if (customId === 'add_protected_role') {
      await this.showAddProtectedRoleModal(interaction);
    }
    else if (customId === 'remove_protected_role') {
      await this.showRemoveProtectedRoleModal(interaction);
    }
    else if (customId === 'add_whitelist_bot') {
      await this.showAddWhitelistBotModal(interaction);
    }
    else if (customId === 'remove_whitelist_bot') {
      await this.showRemoveWhitelistBotModal(interaction);
    }
    else if (customId === 'set_jail_role') {
      await this.showSetJailRoleModal(interaction);
    }
    else if (customId === 'set_log_channel') {
      await this.showSetLogChannelModal(interaction);
    }
    
    else if (customId === 'modal_add_safe_user') {
      await this.handleAddSafeUser(client, interaction, guild);
    }
    else if (customId === 'modal_remove_safe_user') {
      await this.handleRemoveSafeUser(client, interaction, guild);
    }
    else if (customId === 'modal_add_safe_role') {
      await this.handleAddSafeRole(client, interaction, guild);
    }
    else if (customId === 'modal_remove_safe_role') {
      await this.handleRemoveSafeRole(client, interaction, guild);
    }
    else if (customId === 'modal_add_allowed_bot') {
      await this.handleAddAllowedBot(client, interaction, guild);
    }
    else if (customId === 'modal_remove_allowed_bot') {
      await this.handleRemoveAllowedBot(client, interaction, guild);
    }
    else if (customId === 'modal_add_protected_role') {
      await this.handleAddProtectedRole(client, interaction, guild);
    }
    else if (customId === 'modal_remove_protected_role') {
      await this.handleRemoveProtectedRole(client, interaction, guild);
    }
    else if (customId === 'modal_add_whitelist_bot') {
      await this.handleAddWhitelistBot(client, interaction, guild);
    }
    else if (customId === 'modal_remove_whitelist_bot') {
      await this.handleRemoveWhitelistBot(client, interaction, guild);
    }
    else if (customId === 'modal_set_jail_role') {
      await this.handleSetJailRole(client, interaction, guild);
    }
    else if (customId === 'modal_set_log_channel') {
      await this.handleSetLogChannel(client, interaction, guild);
    }
    else if (customId.startsWith('modal_set_limit_')) {
      await this.handleModalSetLimit(client, interaction, guild);
    }
    
    else if (customId.startsWith('antispam_') || customId.startsWith('modal_antispam_')) {
      await this.handleAntiSpamAction(client, interaction, guild);
    }
    else if (customId === 'backup_toggle') {
      await this.handleBackupToggle(client, interaction, guild);
    }
    else if (customId === 'backup_set_interval') {
      await this.showBackupIntervalModal(interaction);
    }
    else if (customId === 'modal_backup_interval') {
      await this.handleModalBackupInterval(client, interaction, guild);
    }
    
    else if (customId.startsWith('cmdperm_') || customId.startsWith('modal_cmdperm_')) {
      await this.handleCommandPermissionAction(client, interaction, guild);
    }
    
    else if (customId === 'show_safe_users') {
      await this.showSafeUsersList(client, interaction, guild);
    }
    else if (customId === 'show_safe_roles') {
      await this.showSafeRolesList(client, interaction, guild);
    }
    else if (customId === 'show_allowed_bots') {
      await this.showAllowedBotsList(client, interaction, guild);
    }
    else if (customId === 'show_whitelist_bots') {
      await this.showWhitelistBotsList(client, interaction, guild);
    }
    
    else if (customId === 'back_to_main') {
      const embed = await this.createMainPanelEmbed(client, guild.id);
      const components = await this.createMainPanelComponents(client, guild.id);
      
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed], components });
      } else {
        await interaction.update({ embeds: [embed], components });
      }
    }
  },

  async showSecuritySettings(client, interaction, guild) {
    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('🔒 Güvenlik Ayarları')
      .addFields(
        {
          name: '🛡️ Safeguard Durumu',
          value: settings.safeguard.enabled ? '✅ Aktif' : '❌ Kapalı',
          inline: false
        },
        {
          name: '👥 Güvenli Kullanıcılar',
          value: `${settings.safeguard.safeUsers.length} kullanıcı`,
          inline: true
        },
        {
          name: '🎭 Güvenli Roller',
          value: `${settings.safeguard.safeRoles.length} rol`,
          inline: true
        },
        {
          name: '🤖 İzinli Botlar',
          value: `${settings.safeguard.allowedBots.length} bot`,
          inline: true
        },
        {
          name: '♾️ Whitelist Botlar',
          value: `${settings.safeguard.whitelistBots.length} bot`,
          inline: true
        },
        {
          name: '🛡️ Korumalı Roller',
          value: `${settings.protectedRoles.length} rol`,
          inline: true
        },
        {
          name: '⛓️ Jail Rolü',
          value: settings.safeguard.jailRole ? `<@&${settings.safeguard.jailRole}>` : '❌ Ayarlanmamış',
          inline: true
        }
      );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('toggle_safeguard')
        .setLabel(settings.safeguard.enabled ? 'Safeguard Kapat' : 'Safeguard Aç')
        .setStyle(settings.safeguard.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji('🛡️'),
      new ButtonBuilder()
        .setCustomId('set_jail_role')
        .setLabel('Jail Rolü Ayarla')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⛓️'),
      new ButtonBuilder()
        .setCustomId('back_to_main')
        .setLabel('Ana Menü')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔙')
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('add_safe_user')
        .setLabel('Güvenli Kullanıcı Ekle')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('➕'),
      new ButtonBuilder()
        .setCustomId('remove_safe_user')
        .setLabel('Güvenli Kullanıcı Çıkar')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('➖'),
      new ButtonBuilder()
        .setCustomId('show_safe_users')
        .setLabel('Listeyi Gör')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📋')
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('add_safe_role')
        .setLabel('Güvenli Rol Ekle')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('➕'),
      new ButtonBuilder()
        .setCustomId('remove_safe_role')
        .setLabel('Güvenli Rol Çıkar')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('➖'),
      new ButtonBuilder()
        .setCustomId('show_safe_roles')
        .setLabel('Listeyi Gör')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📋')
    );

    const row4 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('add_allowed_bot')
        .setLabel('Bot İzni Ekle')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('➕'),
      new ButtonBuilder()
        .setCustomId('remove_allowed_bot')
        .setLabel('Bot İzni Çıkar')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('➖'),
      new ButtonBuilder()
        .setCustomId('show_allowed_bots')
        .setLabel('Listeyi Gör')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📋')
    );

    const row5 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('add_protected_role')
        .setLabel('Korumalı Rol Ekle')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🛡️'),
      new ButtonBuilder()
        .setCustomId('remove_protected_role')
        .setLabel('Korumalı Rol Çıkar')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🛡️'),
      new ButtonBuilder()
        .setCustomId('add_whitelist_bot')
        .setLabel('Whitelist Bot Ekle')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('♾️'),
      new ButtonBuilder()
        .setCustomId('remove_whitelist_bot')
        .setLabel('Whitelist Bot Çıkar')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('♾️'),
      new ButtonBuilder()
        .setCustomId('show_whitelist_bots')
        .setLabel('Listeyi Gör')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📋')
    );

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [embed], components: [row1, row2, row3, row4, row5] });
    } else {
      await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4, row5] });
    }
  },

  async showGuardSettings(client, interaction, guild) {
    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('🛡️ Guard Ayarları')
      .setDescription('Açmak/kapatmak istediğiniz guard\'ı seçin')
      .addFields(
        {
          name: 'Rol Guard',
          value: [
            `Oluşturma: ${settings.guards.roleGuard.create ? '✅' : '❌'}`,
            `Silme: ${settings.guards.roleGuard.delete ? '✅' : '❌'}`,
            `Güncelleme: ${settings.guards.roleGuard.update ? '✅' : '❌'}`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Kanal Guard',
          value: [
            `Oluşturma: ${settings.guards.channelGuard.create ? '✅' : '❌'}`,
            `Silme: ${settings.guards.channelGuard.delete ? '✅' : '❌'}`,
            `Güncelleme: ${settings.guards.channelGuard.update ? '✅' : '❌'}`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Diğer Guardlar',
          value: [
            `Ban Guard: ${settings.guards.banGuard ? '✅' : '❌'}`,
            `Kick Guard: ${settings.guards.kickGuard ? '✅' : '❌'}`,
            `Rol Verme Guard: ${settings.guards.roleAssignGuard ? '✅' : '❌'}`,
            `Bot Guard: ${settings.guards.botGuard ? '✅' : '❌'}`,
            `Sunucu Güncelleme Guard: ${settings.guards.guildUpdateGuard ? '✅' : '❌'}`,
            `Vanity Guard: ${settings.guards.vanityGuard ? '✅' : '❌'}`,
            `Spam Guard: ${settings.guards.spamGuard ? '✅' : '❌'}`,
            `Reklam Guard: ${settings.guards.advertisementGuard ? '✅' : '❌'}`
          ].join('\n'),
          inline: false
        }
      );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('toggle_guard_select')
      .setPlaceholder('Guard seç...')
      .addOptions([
        { label: 'Rol Oluşturma', value: 'roleCreate', emoji: '🛡️' },
        { label: 'Rol Silme', value: 'roleDelete', emoji: '🛡️' },
        { label: 'Rol Güncelleme', value: 'roleUpdate', emoji: '🛡️' },
        { label: 'Kanal Oluşturma', value: 'channelCreate', emoji: '🛡️' },
        { label: 'Kanal Silme', value: 'channelDelete', emoji: '🛡️' },
        { label: 'Kanal Güncelleme', value: 'channelUpdate', emoji: '🛡️' },
        { label: 'Ban Guard', value: 'banGuard', emoji: '🔨' },
        { label: 'Kick Guard', value: 'kickGuard', emoji: '👢' },
        { label: 'Rol Verme Guard', value: 'roleAssignGuard', emoji: '🎭' },
        { label: 'Bot Guard', value: 'botGuard', emoji: '🤖' },
        { label: 'Sunucu Güncelleme Guard', value: 'guildUpdateGuard', emoji: '🏠' },
        { label: 'Vanity Guard', value: 'vanityGuard', emoji: '✨' },
        { label: 'Spam Guard', value: 'spamGuard', emoji: '📢' },
        { label: 'Reklam Guard', value: 'advertisementGuard', emoji: '📣' }
      ]);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('back_to_main')
        .setLabel('Ana Menü')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔙')
    );

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    } else {
      await interaction.update({ embeds: [embed], components: [row1, row2] });
    }
  },

  async handleGuardToggle(client, interaction, guild) {
    const guardType = interaction.values[0];
    const settings = await client.permissionsManager.getGuildSettings(guild.id);

    if (guardType === 'roleCreate') {
      settings.guards.roleGuard.create = !settings.guards.roleGuard.create;
    } else if (guardType === 'roleDelete') {
      settings.guards.roleGuard.delete = !settings.guards.roleGuard.delete;
    } else if (guardType === 'roleUpdate') {
      settings.guards.roleGuard.update = !settings.guards.roleGuard.update;
    } else if (guardType === 'channelCreate') {
      settings.guards.channelGuard.create = !settings.guards.channelGuard.create;
    } else if (guardType === 'channelDelete') {
      settings.guards.channelGuard.delete = !settings.guards.channelGuard.delete;
    } else if (guardType === 'channelUpdate') {
      settings.guards.channelGuard.update = !settings.guards.channelGuard.update;
    } else {
      settings.guards[guardType] = !settings.guards[guardType];
    }

    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    let newStatus;
    if (guardType === 'roleCreate') newStatus = settings.guards.roleGuard.create;
    else if (guardType === 'roleDelete') newStatus = settings.guards.roleGuard.delete;
    else if (guardType === 'roleUpdate') newStatus = settings.guards.roleGuard.update;
    else if (guardType === 'channelCreate') newStatus = settings.guards.channelGuard.create;
    else if (guardType === 'channelDelete') newStatus = settings.guards.channelGuard.delete;
    else if (guardType === 'channelUpdate') newStatus = settings.guards.channelGuard.update;
    else newStatus = settings.guards[guardType];

    await interaction.reply({ 
      content: `✅ **${guardType}** guard'ı ${newStatus ? 'açıldı' : 'kapatıldı'}!`, 
      ephemeral: true 
    });
  },

  async showLimitSettings(client, interaction, guild) {
    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('⏱️ Limit Ayarları')
      .setDescription('10 dakikalık zaman penceresinde maksimum işlem sayıları (0 = hiç izin verilmez)')
      .addFields(
        {
          name: 'Kullanıcı İşlemleri',
          value: [
            `Ban: **${settings.limits.ban}**`,
            `Kick: **${settings.limits.kick}**`,
            `Rol Verme: **${settings.limits.roleAssign}**`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Rol İşlemleri',
          value: [
            `Rol Oluşturma: **${settings.limits.roleCreate}**`,
            `Rol Silme: **${settings.limits.roleDelete}**`,
            `Rol Güncelleme: **${settings.limits.roleUpdate}**`
          ].join('\n'),
          inline: true
        },
        {
          name: 'Kanal İşlemleri',
          value: [
            `Kanal Oluşturma: **${settings.limits.channelCreate}**`,
            `Kanal Silme: **${settings.limits.channelDelete}**`,
            `Kanal Güncelleme: **${settings.limits.channelUpdate}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '♾️ Genel Limit',
          value: `Tüm işlemlerin toplamı: **${settings.guards.globalLimit}** / 10 dakika`,
          inline: false
        }
      );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('set_limit_select')
      .setPlaceholder('Limit ayarla...')
      .addOptions([
        { label: 'Ban Limiti', value: 'ban', emoji: '🔨' },
        { label: 'Kick Limiti', value: 'kick', emoji: '👢' },
        { label: 'Rol Verme Limiti', value: 'roleAssign', emoji: '🎭' },
        { label: 'Rol Oluşturma Limiti', value: 'roleCreate', emoji: '➕' },
        { label: 'Rol Silme Limiti', value: 'roleDelete', emoji: '🗑️' },
        { label: 'Rol Güncelleme Limiti', value: 'roleUpdate', emoji: '✏️' },
        { label: 'Kanal Oluşturma Limiti', value: 'channelCreate', emoji: '➕' },
        { label: 'Kanal Silme Limiti', value: 'channelDelete', emoji: '🗑️' },
        { label: 'Kanal Güncelleme Limiti', value: 'channelUpdate', emoji: '✏️' },
        { label: 'Genel Limit (Toplam)', value: 'globalLimit', emoji: '♾️' }
      ]);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('back_to_main')
        .setLabel('Ana Menü')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔙')
    );

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    } else {
      await interaction.update({ embeds: [embed], components: [row1, row2] });
    }
  },

  async handleLimitSet(client, interaction, guild) {
    const limitType = interaction.values[0];
    
    const modal = new ModalBuilder()
      .setCustomId(`modal_set_limit_${limitType}`)
      .setTitle('Limit Ayarla');

    const input = new TextInputBuilder()
      .setCustomId('limit_value')
      .setLabel('Dakika başına maksimum işlem sayısı')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Örn: 3')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(3);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async handleModalSetLimit(client, interaction, guild) {
    const limitType = interaction.customId.replace('modal_set_limit_', '');
    const value = parseInt(interaction.fields.getTextInputValue('limit_value'));

    if (isNaN(value) || value < 0 || value > 999) {
      return await interaction.reply({ 
        content: '❌ Geçersiz değer! (0-999 arası olmalı — 0 = hiç izin verilmez)', 
        ephemeral: true 
      });
    }

    const settings = await client.permissionsManager.getGuildSettings(guild.id);

    if (limitType === 'globalLimit') {
      settings.guards.globalLimit = value;
    } else {
      settings.limits[limitType] = value;
    }

    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    const label = limitType === 'globalLimit' ? 'Genel limit' : `${limitType} limiti`;
    await interaction.reply({ 
      content: `✅ ${label} **${value}** olarak ayarlandı!`, 
      ephemeral: true 
    });
  },

  async showPunishmentSettings(client, interaction, guild) {
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('⚔️ Ceza Ayarları')
      .setDescription('Her guard türü için ceza seçin');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('set_punishment_select')
      .setPlaceholder('Guard türü seç...')
      .addOptions([
        { label: 'Rol Silme Cezası', value: 'roleDelete', emoji: '🛡️' },
        { label: 'Rol Oluşturma Cezası', value: 'roleCreate', emoji: '🛡️' },
        { label: 'Rol Güncelleme Cezası', value: 'roleUpdate', emoji: '🛡️' },
        { label: 'Kanal Silme Cezası', value: 'channelDelete', emoji: '🛡️' },
        { label: 'Kanal Oluşturma Cezası', value: 'channelCreate', emoji: '🛡️' },
        { label: 'Kanal Güncelleme Cezası', value: 'channelUpdate', emoji: '🛡️' },
        { label: 'Sunucu Güncelleme Cezası', value: 'guildUpdate', emoji: '🏠' },
        { label: 'Ban Cezası', value: 'ban', emoji: '🔨' },
        { label: 'Kick Cezası', value: 'kick', emoji: '👢' },
        { label: 'Rol Verme Cezası', value: 'roleAssign', emoji: '🎭' },
        { label: 'Bot Ekleme Cezası', value: 'botAdd', emoji: '🤖' },
        { label: 'Vanity Değişikliği Cezası', value: 'vanityUpdate', emoji: '✨' }
      ]);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('back_to_main')
        .setLabel('Ana Menü')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔙')
    );

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    } else {
      await interaction.update({ embeds: [embed], components: [row1, row2] });
    }
  },

  async handlePunishmentSet(client, interaction, guild) {
    const guardType = interaction.values[0];
    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    
    const currentPunishments = settings.punishments[guardType]?.actions || settings.punishments[guardType]?.default || [];

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle(`⚔️ ${guardType} Ceza Ayarları`)
      .setDescription(`Mevcut: ${currentPunishments.map(p => `\`${p}\``).join(', ') || 'Yok'}`)
      .addFields({
        name: 'Ceza Seçenekleri',
        value: '`ban` - Ban at\n`kick` - Kick at\n`removePerms` - Yetkileri çek\n`jail` - Jail\'e at\n`closePerms` - Tüm yetkileri kapat\n`none` - Cezasız',
        inline: false
      });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`punishment_${guardType}`)
      .setPlaceholder('Ceza seç (çoklu seçim)')
      .setMinValues(1)
      .setMaxValues(6)
      .addOptions([
        { label: 'Ban', value: 'ban', emoji: '🔨' },
        { label: 'Kick', value: 'kick', emoji: '👢' },
        { label: 'Yetki Çek', value: 'removePerms', emoji: '🔒' },
        { label: 'Jail', value: 'jail', emoji: '⛓️' },
        { label: 'Tüm Yetkileri Kapat', value: 'closePerms', emoji: '🚫' },
        { label: 'Cezasız', value: 'none', emoji: '✨' }
      ]);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('back_to_main')
        .setLabel('Ana Menü')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔙')
    );

    await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
  },

  async showBackupSettings(client, interaction, guild) {
    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    const hours = settings.backup.interval / 1000 / 60 / 60;
    
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('💾 Backup Ayarları')
      .addFields(
        {
          name: 'Durum',
          value: settings.backup.enabled ? '✅ Aktif' : '❌ Kapalı',
          inline: true
        },
        {
          name: 'Süre',
          value: `Her ${hours} saatte bir`,
          inline: true
        },
        {
          name: 'Son Backup',
          value: settings.backup.lastBackup 
            ? `<t:${Math.floor(settings.backup.lastBackup.getTime() / 1000)}:R>`
            : 'Henüz alınmadı',
          inline: true
        }
      )
      .setDescription('Backup ayarlarını buradan yönetebilirsiniz.');

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('backup_toggle')
        .setLabel(settings.backup.enabled ? 'Backup Kapat' : 'Backup Aç')
        .setStyle(settings.backup.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji('💾'),
      new ButtonBuilder()
        .setCustomId('backup_set_interval')
        .setLabel('Süre Ayarla')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⏱️')
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('back_to_main')
        .setLabel('Ana Menü')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔙')
    );

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    } else {
      await interaction.update({ embeds: [embed], components: [row1, row2] });
    }
  },

  async handleBackupToggle(client, interaction, guild) {
    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    settings.backup.enabled = !settings.backup.enabled;
    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    await interaction.reply({
      content: `✅ Otomatik backup ${settings.backup.enabled ? 'açıldı' : 'kapatıldı'}!`,
      ephemeral: true
    });
  },

  async showBackupIntervalModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_backup_interval')
      .setTitle('Backup Süresi');

    const input = new TextInputBuilder()
      .setCustomId('backup_hours')
      .setLabel('Kaç saatte bir yedek alınsın?')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Örn: 6')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(3);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  },

  async handleModalBackupInterval(client, interaction, guild) {
    const hours = parseInt(interaction.fields.getTextInputValue('backup_hours'));

    if (isNaN(hours) || hours < 1 || hours > 168) {
      return await interaction.reply({
        content: '❌ Geçersiz değer! (1-168 saat arası olmalı)',
        ephemeral: true
      });
    }

    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    settings.backup.interval = hours * 60 * 60 * 1000;
    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    await interaction.reply({
      content: `✅ Backup süresi **${hours} saat** olarak ayarlandı!`,
      ephemeral: true
    });
  },

  async showLogSettings(client, interaction, guild) {
    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('📋 Log Ayarları')
      .addFields({
        name: 'Log Kanalı',
        value: settings.logChannel ? `<#${settings.logChannel}>` : '❌ Ayarlanmamış',
        inline: false
      });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('set_log_channel')
        .setLabel('Log Kanalı Ayarla')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📋')
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('back_to_main')
        .setLabel('Ana Menü')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔙')
    );

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    } else {
      await interaction.update({ embeds: [embed], components: [row1, row2] });
    }
  },

  async showAntiSpamSettings(client, interaction, guild) {
    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    const sp = settings.antiSpam;
    const ad = settings.antiAdvertisement;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('🚨 Spam & Reklam Ayarları')
      .setDescription('Uyarı eşiğine ulaşan kullanıcı otomatik timeout alır.')
      .addFields(
        {
          name: '📢 Anti-Spam',
          value: [
            `Durum: ${sp.enabled ? '✅ Aktif' : '❌ Kapalı'}`,
            `Uyarı Eşiği: **${sp.maxWarnings}**`,
            `Timeout: **${Math.round(sp.timeoutDuration / 60000)} dk**`
          ].join('\n'),
          inline: true
        },
        {
          name: '📣 Anti-Reklam',
          value: [
            `Durum: ${ad.enabled ? '✅ Aktif' : '❌ Kapalı'}`,
            `Uyarı Eşiği: **${ad.maxWarnings}**`,
            `Timeout: **${Math.round(ad.timeoutDuration / 60000)} dk**`
          ].join('\n'),
          inline: true
        }
      );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('antispam_toggle:spam')
        .setLabel(sp.enabled ? 'Anti-Spam Kapat' : 'Anti-Spam Aç')
        .setStyle(sp.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji('📢'),
      new ButtonBuilder()
        .setCustomId('antispam_setmax:spam')
        .setLabel('Spam Eşiği')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔢'),
      new ButtonBuilder()
        .setCustomId('antispam_settimeout:spam')
        .setLabel('Spam Timeout')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⏱️')
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('antispam_toggle:ad')
        .setLabel(ad.enabled ? 'Anti-Reklam Kapat' : 'Anti-Reklam Aç')
        .setStyle(ad.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji('📣'),
      new ButtonBuilder()
        .setCustomId('antispam_setmax:ad')
        .setLabel('Reklam Eşiği')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔢'),
      new ButtonBuilder()
        .setCustomId('antispam_settimeout:ad')
        .setLabel('Reklam Timeout')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⏱️')
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('back_to_main')
        .setLabel('Ana Menü')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔙')
    );

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [embed], components: [row1, row2, row3] });
    } else {
      await interaction.update({ embeds: [embed], components: [row1, row2, row3] });
    }
  },

  antiSpamKey(type) {
    return type === 'ad' ? 'antiAdvertisement' : 'antiSpam';
  },

  antiSpamLabel(type) {
    return type === 'ad' ? 'Anti-Reklam' : 'Anti-Spam';
  },

  async handleAntiSpamAction(client, interaction, guild) {
    const [base, type] = interaction.customId.split(':');
    const key = this.antiSpamKey(type);
    const label = this.antiSpamLabel(type);

    if (base === 'antispam_toggle') {
      const settings = await client.permissionsManager.getGuildSettings(guild.id);
      settings[key].enabled = !settings[key].enabled;
      await settings.save();
      client.permissionsManager.updateCache(guild.id, settings);
      return interaction.reply({ 
        content: `✅ ${label} ${settings[key].enabled ? 'açıldı' : 'kapatıldı'}!`, 
        ephemeral: true 
      });
    }

    if (base === 'antispam_setmax') {
      const modal = new ModalBuilder()
        .setCustomId(`modal_antispam_max:${type}`)
        .setTitle(`${label} Uyarı Eşiği`);
      const input = new TextInputBuilder()
        .setCustomId('value')
        .setLabel('Kaç uyarıdan sonra ceza uygulansın?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: 3')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(3);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (base === 'antispam_settimeout') {
      const modal = new ModalBuilder()
        .setCustomId(`modal_antispam_timeout:${type}`)
        .setTitle(`${label} Timeout Süresi`);
      const input = new TextInputBuilder()
        .setCustomId('value')
        .setLabel('Timeout süresi (dakika)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örn: 10')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(4);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (base === 'modal_antispam_max') {
      const value = parseInt(interaction.fields.getTextInputValue('value'));
      if (isNaN(value) || value < 1 || value > 100) {
        return interaction.reply({ content: '❌ Geçersiz değer! (1-100 arası olmalı)', ephemeral: true });
      }
      const settings = await client.permissionsManager.getGuildSettings(guild.id);
      settings[key].maxWarnings = value;
      await settings.save();
      client.permissionsManager.updateCache(guild.id, settings);
      return interaction.reply({ 
        content: `✅ ${label} uyarı eşiği **${value}** olarak ayarlandı!`, 
        ephemeral: true 
      });
    }

    if (base === 'modal_antispam_timeout') {
      const minutes = parseInt(interaction.fields.getTextInputValue('value'));
      if (isNaN(minutes) || minutes < 1 || minutes > 10080) {
        return interaction.reply({ content: '❌ Geçersiz değer! (1-10080 dakika)', ephemeral: true });
      }
      const settings = await client.permissionsManager.getGuildSettings(guild.id);
      settings[key].timeoutDuration = minutes * 60000;
      await settings.save();
      client.permissionsManager.updateCache(guild.id, settings);
      return interaction.reply({ 
        content: `✅ ${label} timeout süresi **${minutes} dakika** olarak ayarlandı!`, 
        ephemeral: true 
      });
    }
  },

  async showAddSafeUserModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_add_safe_user')
      .setTitle('Güvenli Kullanıcı Ekle');

    const input = new TextInputBuilder()
      .setCustomId('user_id')
      .setLabel('Kullanıcı ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async showAddSafeRoleModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_add_safe_role')
      .setTitle('Güvenli Rol Ekle');

    const input = new TextInputBuilder()
      .setCustomId('role_id')
      .setLabel('Rol ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async showAddAllowedBotModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_add_allowed_bot')
      .setTitle('İzinli Bot Ekle');

    const input = new TextInputBuilder()
      .setCustomId('bot_id')
      .setLabel('Bot ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async showSetJailRoleModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_set_jail_role')
      .setTitle('Jail Rolü Ayarla');

    const input = new TextInputBuilder()
      .setCustomId('jail_role_id')
      .setLabel('Jail Rol ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async showSetLogChannelModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_set_log_channel')
      .setTitle('Log Kanalı Ayarla');

    const input = new TextInputBuilder()
      .setCustomId('log_channel_id')
      .setLabel('Kanal ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async handleAddSafeUser(client, interaction, guild) {
    const userId = interaction.fields.getTextInputValue('user_id');
    const settings = await client.permissionsManager.getGuildSettings(guild.id);

    if (settings.safeguard.safeUsers.includes(userId)) {
      return await interaction.reply({ content: '❌ Bu kullanıcı zaten güvenli listede!', ephemeral: true });
    }

    settings.safeguard.safeUsers.push(userId);
    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    await interaction.reply({ content: `<@${userId}> güvenli kullanıcılara eklendi!`, ephemeral: true });
  },

  async handleAddSafeRole(client, interaction, guild) {
    const roleId = interaction.fields.getTextInputValue('role_id');
    const settings = await client.permissionsManager.getGuildSettings(guild.id);

    if (settings.safeguard.safeRoles.includes(roleId)) {
      return await interaction.reply({ content: '❌ Bu rol zaten güvenli listede!', ephemeral: true });
    }

    settings.safeguard.safeRoles.push(roleId);
    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    await interaction.reply({ content: `<@&${roleId}> güvenli rollere eklendi!`, ephemeral: true });
  },

  async handleAddAllowedBot(client, interaction, guild) {
    const botId = interaction.fields.getTextInputValue('bot_id');
    const settings = await client.permissionsManager.getGuildSettings(guild.id);

    if (settings.safeguard.allowedBots.includes(botId)) {
      return await interaction.reply({ content: '❌ Bu bot zaten izinli listede!', ephemeral: true });
    }

    settings.safeguard.allowedBots.push(botId);
    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    await interaction.reply({ content: `Bot izinli listeye eklendi!`, ephemeral: true });
  },

  async handleAddWhitelistBot(client, interaction, guild) {
    const botId = interaction.fields.getTextInputValue('bot_id');
    const settings = await client.permissionsManager.getGuildSettings(guild.id);

    if (settings.safeguard.whitelistBots.includes(botId)) {
      return await interaction.reply({ content: '❌ Bu bot zaten whitelist listede!', ephemeral: true });
    }

    settings.safeguard.whitelistBots.push(botId);
    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    await interaction.reply({ content: `<@${botId}> whitelist botlara eklendi! (Sınırsız)`, ephemeral: true });
  },

  async handleSetJailRole(client, interaction, guild) {
    const roleId = interaction.fields.getTextInputValue('jail_role_id');
    const role = guild.roles.cache.get(roleId);

    if (!role) {
      return await interaction.reply({ content: '❌ Rol bulunamadı!', ephemeral: true });
    }

    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    settings.safeguard.jailRole = roleId;
    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    await interaction.reply({ content: `Jail rolü <@&${roleId}> olarak ayarlandı!`, ephemeral: true });
  },

  async handleSetLogChannel(client, interaction, guild) {
    const channelId = interaction.fields.getTextInputValue('log_channel_id');
    const channel = guild.channels.cache.get(channelId);

    if (!channel || channel.type !== ChannelType.GuildText) {
      return await interaction.reply({ content: '❌ Geçerli bir metin kanalı bulunamadı!', ephemeral: true });
    }

    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    settings.logChannel = channelId;
    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    await interaction.reply({ content: `Log kanalı <#${channelId}> olarak ayarlandı!`, ephemeral: true });
  },

  async showSafeUsersList(client, interaction, guild) {
    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    
    const list = settings.safeguard.safeUsers.length > 0
      ? settings.safeguard.safeUsers.map(id => `<@${id}>`).join('\n')
      : 'Liste boş';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('Güvenli Kullanıcılar')
      .setDescription(list);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async showSafeRolesList(client, interaction, guild) {
    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    
    const list = settings.safeguard.safeRoles.length > 0
      ? settings.safeguard.safeRoles.map(id => `<@&${id}>`).join('\n')
      : 'Liste boş';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('Güvenli Roller')
      .setDescription(list);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async showAllowedBotsList(client, interaction, guild) {
    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    
    const list = settings.safeguard.allowedBots.length > 0
      ? settings.safeguard.allowedBots.map(id => `<@${id}>`).join('\n')
      : 'Liste boş';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('İzinli Botlar')
      .setDescription(list);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async showWhitelistBotsList(client, interaction, guild) {
    const settings = await client.permissionsManager.getGuildSettings(guild.id);
    
    const list = settings.safeguard.whitelistBots.length > 0
      ? settings.safeguard.whitelistBots.map(id => `<@${id}>`).join('\n')
      : 'Liste boş';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('♾️ Whitelist Botlar')
      .setDescription(`Bu botların işlemleri **sınırsızdır** ve guard tarafından engellenmez.\n\n${list}`);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async showRemoveSafeUserModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_remove_safe_user')
      .setTitle('Güvenli Kullanıcı Çıkar');

    const input = new TextInputBuilder()
      .setCustomId('user_id')
      .setLabel('Kullanıcı ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async showRemoveSafeRoleModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_remove_safe_role')
      .setTitle('Güvenli Rol Çıkar');

    const input = new TextInputBuilder()
      .setCustomId('role_id')
      .setLabel('Rol ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async showRemoveAllowedBotModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_remove_allowed_bot')
      .setTitle('İzinli Bot Çıkar');

    const input = new TextInputBuilder()
      .setCustomId('bot_id')
      .setLabel('Bot ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async showAddWhitelistBotModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_add_whitelist_bot')
      .setTitle('Whitelist Bot Ekle');

    const input = new TextInputBuilder()
      .setCustomId('bot_id')
      .setLabel('Bot ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async showRemoveWhitelistBotModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_remove_whitelist_bot')
      .setTitle('Whitelist Bot Çıkar');

    const input = new TextInputBuilder()
      .setCustomId('bot_id')
      .setLabel('Bot ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async showAddProtectedRoleModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_add_protected_role')
      .setTitle('Korumalı Rol Ekle');

    const input = new TextInputBuilder()
      .setCustomId('role_id')
      .setLabel('Rol ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async showRemoveProtectedRoleModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('modal_remove_protected_role')
      .setTitle('Korumalı Rol Çıkar');

    const input = new TextInputBuilder()
      .setCustomId('role_id')
      .setLabel('Rol ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async handleRemoveSafeUser(client, interaction, guild) {
    const userId = interaction.fields.getTextInputValue('user_id');
    const settings = await client.permissionsManager.getGuildSettings(guild.id);

    const index = settings.safeguard.safeUsers.indexOf(userId);
    if (index === -1) {
      return await interaction.reply({ content: '❌ Bu kullanıcı güvenli listede değil!', ephemeral: true });
    }

    settings.safeguard.safeUsers.splice(index, 1);
    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    await interaction.reply({ content: `<@${userId}> güvenli kullanıcılardan çıkarıldı!`, ephemeral: true });
  },

  async handleRemoveSafeRole(client, interaction, guild) {
    const roleId = interaction.fields.getTextInputValue('role_id');
    const settings = await client.permissionsManager.getGuildSettings(guild.id);

    const index = settings.safeguard.safeRoles.indexOf(roleId);
    if (index === -1) {
      return await interaction.reply({ content: '❌ Bu rol güvenli listede değil!', ephemeral: true });
    }

    settings.safeguard.safeRoles.splice(index, 1);
    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    await interaction.reply({ content: `<@&${roleId}> güvenli rollerden çıkarıldı!`, ephemeral: true });
  },

  async handleRemoveAllowedBot(client, interaction, guild) {
    const botId = interaction.fields.getTextInputValue('bot_id');
    const settings = await client.permissionsManager.getGuildSettings(guild.id);

    const index = settings.safeguard.allowedBots.indexOf(botId);
    if (index === -1) {
      return await interaction.reply({ content: '❌ Bu bot izinli listede değil!', ephemeral: true });
    }

    settings.safeguard.allowedBots.splice(index, 1);
    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    await interaction.reply({ content: `Bot izinli listeden çıkarıldı!`, ephemeral: true });
  },

  async handleRemoveWhitelistBot(client, interaction, guild) {
    const botId = interaction.fields.getTextInputValue('bot_id');
    const settings = await client.permissionsManager.getGuildSettings(guild.id);

    const index = settings.safeguard.whitelistBots.indexOf(botId);
    if (index === -1) {
      return await interaction.reply({ content: '❌ Bu bot whitelist listede değil!', ephemeral: true });
    }

    settings.safeguard.whitelistBots.splice(index, 1);
    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    await interaction.reply({ content: `<@${botId}> whitelist botlardan çıkarıldı!`, ephemeral: true });
  },

  async handleAddProtectedRole(client, interaction, guild) {
    const roleId = interaction.fields.getTextInputValue('role_id');
    const role = guild.roles.cache.get(roleId);

    if (!role) {
      return await interaction.reply({ content: '❌ Rol bulunamadı!', ephemeral: true });
    }

    const settings = await client.permissionsManager.getGuildSettings(guild.id);

    if (settings.protectedRoles.includes(roleId)) {
      return await interaction.reply({ content: '❌ Bu rol zaten korumalı listede!', ephemeral: true });
    }

    settings.protectedRoles.push(roleId);
    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    await interaction.reply({ content: `<@&${roleId}> korumalı rollere eklendi!`, ephemeral: true });
  },

  async handleRemoveProtectedRole(client, interaction, guild) {
    const roleId = interaction.fields.getTextInputValue('role_id');
    const settings = await client.permissionsManager.getGuildSettings(guild.id);

    const index = settings.protectedRoles.indexOf(roleId);
    if (index === -1) {
      return await interaction.reply({ content: '❌ Bu rol korumalı listede değil!', ephemeral: true });
    }

    settings.protectedRoles.splice(index, 1);
    await settings.save();
    client.permissionsManager.updateCache(guild.id, settings);

    await interaction.reply({ content: `<@&${roleId}> korumalı rollerden çıkarıldı!`, ephemeral: true });
  },

  // ───────────────────────── Komut Yetkileri ─────────────────────────

  async getCommandDoc(client, guild, commandName) {
    const guildId = typeof guild === 'string' ? guild : guild.id;
    let doc = await GuardCommandSettings.findOne({ guildId, commandName });
    if (!doc) {
      doc = new GuardCommandSettings({ guildId, commandName });
      const staticDefault = client.prefixCommands.get(commandName)?.permissions?.guardWhitelistDefault === true;
      doc.guardWhitelistAllowed = staticDefault;
    }
    return doc;
  },

  async sendCommandPermissionPayload(interaction, payload) {
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply(payload);
    }
    return interaction.update(payload);
  },

  modeLabel(mode) {
    if (mode === 'whitelist') return '✅ Whitelist';
    if (mode === 'blacklist') return '⛔ Blacklist';
    return '➖ Kapalı';
  },

  async showCommandPermissionList(client, interaction, guild) {
    const names = GUARD_COMMAND_LIST.map((c) => c.name);
    const docs = await GuardCommandSettings.find({ guildId: guild.id, commandName: { $in: names } }).lean();
    const map = new Map(docs.map((d) => [d.commandName, d]));

    const lines = GUARD_COMMAND_LIST.map((c) => {
      const d = map.get(c.name);
      const state = d ? (d.enabled === false ? '❌ Kapalı' : '✅ Açık') : '⚙️ Varsayılan';
      return `${c.emoji} **${c.label}** — ${state}`;
    });

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle('🔑 Komut Yetkileri')
      .setDescription('Yetkisini düzenlemek istediğiniz komutu seçin.\n\n' + lines.join('\n'))
      .addFields({
        name: 'ℹ️ Bilgi',
        value: 'Sunucu sahibi ve bot sahipleri her komutu her zaman kullanabilir.\n`guard-panel` komutu güvenlik nedeniyle sadece owner + yöneticilere açıktır.',
        inline: false
      });

    const select = new StringSelectMenuBuilder()
      .setCustomId('cmdperm_select')
      .setPlaceholder('Komut seçin...')
      .addOptions(GUARD_COMMAND_LIST.map((c) => ({
        label: c.label,
        description: c.description,
        value: c.name,
        emoji: c.emoji
      })));

    const row1 = new ActionRowBuilder().addComponents(select);
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('back_to_main').setLabel('Ana Menü').setStyle(ButtonStyle.Danger).setEmoji('🔙')
    );

    await this.sendCommandPermissionPayload(interaction, { embeds: [embed], components: [row1, row2] });
  },

  async showCommandPermissionDetail(client, interaction, guild, commandName) {
    const meta = GUARD_COMMAND_LIST.find((c) => c.name === commandName);
    if (!meta) return this.showCommandPermissionList(client, interaction, guild);

    const doc = await this.getCommandDoc(client, guild, commandName);

    const userList = doc.userMode === 'blacklist' ? doc.blockedUsers : doc.allowedUsers;
    const roleList = doc.roleMode === 'blacklist' ? doc.blockedRoles : doc.allowedRoles;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle(`${meta.emoji} ${meta.label} — Komut Yetkisi`)
      .addFields(
        { name: 'Durum', value: doc.enabled === false ? '❌ Kapalı (sadece owner)' : '✅ Açık', inline: true },
        { name: 'Guard Whitelist İzni', value: doc.guardWhitelistAllowed ? '✅ Açık' : '❌ Kapalı', inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        { name: 'Kullanıcı Modu', value: `${this.modeLabel(doc.userMode)} (${userList.length})`, inline: true },
        { name: 'Rol Modu', value: `${this.modeLabel(doc.roleMode)} (${roleList.length})`, inline: true }
      );

    if (doc.userMode !== 'off' && userList.length > 0) {
      embed.addFields({
        name: 'Kullanıcılar',
        value: userList.slice(0, 20).map((id) => `<@${id}>`).join(', '),
        inline: false
      });
    }
    if (doc.roleMode !== 'off' && roleList.length > 0) {
      embed.addFields({
        name: 'Roller',
        value: roleList.slice(0, 20).map((id) => `<@&${id}>`).join(', '),
        inline: false
      });
    }

    const switchSelect = new StringSelectMenuBuilder()
      .setCustomId('cmdperm_select')
      .setPlaceholder('Başka komut seç...')
      .addOptions(GUARD_COMMAND_LIST.map((c) => ({
        label: c.label,
        value: c.name,
        emoji: c.emoji,
        default: c.name === commandName
      })));

    const row1 = new ActionRowBuilder().addComponents(switchSelect);
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`cmdperm_toggle_enabled:${commandName}`)
        .setLabel(doc.enabled === false ? 'Komutu Aç' : 'Komutu Kapat')
        .setStyle(doc.enabled === false ? ButtonStyle.Success : ButtonStyle.Danger)
        .setEmoji('🔌'),
      new ButtonBuilder()
        .setCustomId(`cmdperm_toggle_guardwl:${commandName}`)
        .setLabel('Guard Whitelist İzni')
        .setStyle(doc.guardWhitelistAllowed ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setEmoji('♾️'),
      new ButtonBuilder()
        .setCustomId(`cmdperm_reset:${commandName}`)
        .setLabel('Sıfırla')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('♻️')
    );
    const row3 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`cmdperm_usermode:${commandName}`)
        .setPlaceholder('Kullanıcı modu seç...')
        .addOptions(COMMAND_MODE_OPTIONS(doc.userMode))
    );
    const row4 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`cmdperm_rolemode:${commandName}`)
        .setPlaceholder('Rol modu seç...')
        .addOptions(COMMAND_MODE_OPTIONS(doc.roleMode))
    );
    const row5 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`cmdperm_manage_users:${commandName}`)
        .setLabel('Kullanıcı Ekle/Çıkar')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👤'),
      new ButtonBuilder()
        .setCustomId(`cmdperm_manage_roles:${commandName}`)
        .setLabel('Rol Ekle/Çıkar')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎭'),
      new ButtonBuilder()
        .setCustomId('cmdperm_back')
        .setLabel('Geri')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔙')
    );

    await this.sendCommandPermissionPayload(interaction, {
      embeds: [embed],
      components: [row1, row2, row3, row4, row5]
    });
  },

  async showCommandUserManage(client, interaction, guild, commandName) {
    const doc = await this.getCommandDoc(client, guild, commandName);

    if (doc.userMode === 'off') {
      return interaction.reply({
        content: '❌ Önce bir **Kullanıcı Modu** seçin (Whitelist veya Blacklist).',
        ephemeral: true
      });
    }

    const isBlack = doc.userMode === 'blacklist';
    const list = isBlack ? doc.blockedUsers : doc.allowedUsers;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle(`👤 ${commandName} — Kullanıcılar`)
      .setDescription(
        `Mod: **${isBlack ? 'Blacklist' : 'Whitelist'}**\n\n` +
        `Liste (${list.length}): ${list.length ? list.map((id) => `<@${id}>`).join(', ') : 'Boş'}`
      );

    const rows = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`cmdperm_add_user:${commandName}`).setLabel('Kullanıcı Ekle').setStyle(ButtonStyle.Success).setEmoji('➕'),
        new ButtonBuilder().setCustomId(`cmdperm_detail:${commandName}`).setLabel('Geri').setStyle(ButtonStyle.Secondary).setEmoji('🔙')
      )
    ];

    if (list.length > 0) {
      rows.push(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`cmdperm_remove_user:${commandName}`)
          .setPlaceholder('Çıkarılacak kullanıcı...')
          .addOptions(list.slice(0, 25).map((id) => ({ label: id, value: id })))
      ));
    }

    await this.sendCommandPermissionPayload(interaction, { embeds: [embed], components: rows });
  },

  async showCommandRoleManage(client, interaction, guild, commandName) {
    const doc = await this.getCommandDoc(client, guild, commandName);

    if (doc.roleMode === 'off') {
      return interaction.reply({
        content: '❌ Önce bir **Rol Modu** seçin (Whitelist veya Blacklist).',
        ephemeral: true
      });
    }

    const isBlack = doc.roleMode === 'blacklist';
    const list = isBlack ? doc.blockedRoles : doc.allowedRoles;
    const validRoles = list.filter((id) => guild.roles.cache.has(id));

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setTitle(`🎭 ${commandName} — Roller`)
      .setDescription(
        `Mod: **${isBlack ? 'Blacklist' : 'Whitelist'}**\n\n` +
        `Liste (${list.length}): ${validRoles.length ? validRoles.map((id) => `<@&${id}>`).join(', ') : 'Boş'}`
      );

    const rows = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`cmdperm_add_role:${commandName}`).setLabel('Rol Ekle').setStyle(ButtonStyle.Success).setEmoji('➕'),
        new ButtonBuilder().setCustomId(`cmdperm_detail:${commandName}`).setLabel('Geri').setStyle(ButtonStyle.Secondary).setEmoji('🔙')
      )
    ];

    if (validRoles.length > 0) {
      rows.push(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`cmdperm_remove_role:${commandName}`)
          .setPlaceholder('Çıkarılacak rol...')
          .addOptions(validRoles.slice(0, 25).map((id) => {
            const role = guild.roles.cache.get(id);
            return { label: role.name.slice(0, 100), value: id };
          }))
      ));
    }

    await this.sendCommandPermissionPayload(interaction, { embeds: [embed], components: rows });
  },

  async showAddCommandUserModal(interaction, commandName) {
    const modal = new ModalBuilder()
      .setCustomId(`modal_cmdperm_add_user:${commandName}`)
      .setTitle('Kullanıcı Ekle');

    const input = new TextInputBuilder()
      .setCustomId('user_id')
      .setLabel('Kullanıcı ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  },

  async showAddCommandRoleModal(interaction, commandName) {
    const modal = new ModalBuilder()
      .setCustomId(`modal_cmdperm_add_role:${commandName}`)
      .setTitle('Rol Ekle');

    const input = new TextInputBuilder()
      .setCustomId('role_id')
      .setLabel('Rol ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('123456789012345678')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  },

  async handleAddCommandUser(client, interaction, guild) {
    const commandName = interaction.customId.split(':')[1];
    const userId = interaction.fields.getTextInputValue('user_id').replace(/[<@!>]/g, '').trim();

    if (!/^\d{17,20}$/.test(userId)) {
      return interaction.reply({ content: '❌ Geçersiz kullanıcı ID!', ephemeral: true });
    }

    const doc = await this.getCommandDoc(client, guild, commandName);
    const list = doc.userMode === 'blacklist' ? doc.blockedUsers : doc.allowedUsers;

    if (list.includes(userId)) {
      return interaction.reply({ content: '❌ Bu kullanıcı zaten listede!', ephemeral: true });
    }

    list.push(userId);
    await doc.save();

    await interaction.reply({ content: `<@${userId}> listeye eklendi.`, ephemeral: true });
  },

  async handleRemoveCommandUser(client, interaction, guild, commandName) {
    const userId = interaction.values[0];
    const doc = await GuardCommandSettings.findOne({ guildId: guild.id, commandName });

    if (!doc) return interaction.reply({ content: '❌ Ayar bulunamadı.', ephemeral: true });

    const list = doc.userMode === 'blacklist' ? doc.blockedUsers : doc.allowedUsers;
    const index = list.indexOf(userId);

    if (index === -1) return interaction.reply({ content: '❌ Kullanıcı listede değil.', ephemeral: true });

    list.splice(index, 1);
    await doc.save();

    await interaction.reply({ content: `<@${userId}> listeden çıkarıldı.`, ephemeral: true });
  },

  async handleAddCommandRole(client, interaction, guild) {
    const commandName = interaction.customId.split(':')[1];
    const roleId = interaction.fields.getTextInputValue('role_id').replace(/[<@&>]/g, '').trim();

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.reply({ content: '❌ Rol bulunamadı!', ephemeral: true });
    }

    const doc = await this.getCommandDoc(client, guild, commandName);
    const list = doc.roleMode === 'blacklist' ? doc.blockedRoles : doc.allowedRoles;

    if (list.includes(roleId)) {
      return interaction.reply({ content: '❌ Bu rol zaten listede!', ephemeral: true });
    }

    list.push(roleId);
    await doc.save();

    await interaction.reply({ content: `<@&${roleId}> listeye eklendi.`, ephemeral: true });
  },

  async handleRemoveCommandRole(client, interaction, guild, commandName) {
    const roleId = interaction.values[0];
    const doc = await GuardCommandSettings.findOne({ guildId: guild.id, commandName });

    if (!doc) return interaction.reply({ content: '❌ Ayar bulunamadı.', ephemeral: true });

    const list = doc.roleMode === 'blacklist' ? doc.blockedRoles : doc.allowedRoles;
    const index = list.indexOf(roleId);

    if (index === -1) return interaction.reply({ content: '❌ Rol listede değil.', ephemeral: true });

    list.splice(index, 1);
    await doc.save();

    await interaction.reply({ content: `<@&${roleId}> listeden çıkarıldı.`, ephemeral: true });
  },

  async handleCommandPermissionAction(client, interaction, guild) {
    const [base, arg] = interaction.customId.split(':');

    switch (base) {
      case 'cmdperm_select':
        return this.showCommandPermissionDetail(client, interaction, guild, interaction.values[0]);
      case 'cmdperm_back':
        return this.showCommandPermissionList(client, interaction, guild);
      case 'cmdperm_detail':
        return this.showCommandPermissionDetail(client, interaction, guild, arg);
      case 'cmdperm_toggle_enabled': {
        const doc = await this.getCommandDoc(client, guild, arg);
        doc.enabled = doc.enabled === false;
        await doc.save();
        return this.showCommandPermissionDetail(client, interaction, guild, arg);
      }
      case 'cmdperm_toggle_guardwl': {
        const doc = await this.getCommandDoc(client, guild, arg);
        doc.guardWhitelistAllowed = !doc.guardWhitelistAllowed;
        await doc.save();
        return this.showCommandPermissionDetail(client, interaction, guild, arg);
      }
      case 'cmdperm_reset':
        await GuardCommandSettings.deleteOne({ guildId: guild.id, commandName: arg });
        return this.showCommandPermissionDetail(client, interaction, guild, arg);
      case 'cmdperm_usermode': {
        const doc = await this.getCommandDoc(client, guild, arg);
        doc.userMode = interaction.values[0];
        await doc.save();
        return this.showCommandPermissionDetail(client, interaction, guild, arg);
      }
      case 'cmdperm_rolemode': {
        const doc = await this.getCommandDoc(client, guild, arg);
        doc.roleMode = interaction.values[0];
        await doc.save();
        return this.showCommandPermissionDetail(client, interaction, guild, arg);
      }
      case 'cmdperm_manage_users':
        return this.showCommandUserManage(client, interaction, guild, arg);
      case 'cmdperm_manage_roles':
        return this.showCommandRoleManage(client, interaction, guild, arg);
      case 'cmdperm_add_user':
        return this.showAddCommandUserModal(interaction, arg);
      case 'cmdperm_add_role':
        return this.showAddCommandRoleModal(interaction, arg);
      case 'cmdperm_remove_user':
        return this.handleRemoveCommandUser(client, interaction, guild, arg);
      case 'cmdperm_remove_role':
        return this.handleRemoveCommandRole(client, interaction, guild, arg);
      case 'modal_cmdperm_add_user':
        return this.handleAddCommandUser(client, interaction, guild);
      case 'modal_cmdperm_add_role':
        return this.handleAddCommandRole(client, interaction, guild);
      default:
        return;
    }
  }
};