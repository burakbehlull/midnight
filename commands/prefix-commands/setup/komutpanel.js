import { CommandSettings } from '#models';
import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags
} from 'discord.js';
import Manager from '#managers';


export default {
  name: 'komutpanel',
  description: 'Komut ayarlarını yönetir (kanal, rol, üye kısıtlamaları)',
  usage: '.komutpanel',
  aliases: ['kpanel', 'komutayar', 'commandpanel'],
  category: 'setup',

  async execute(client, message, args) {
    
    const manager = new Manager(client, {
      action: message
    });

    //const ctrl = await manager.authority.isGuildOwner();
    //if (!ctrl) return message.reply({ content: '❌ Bu komutu kullanmak owner olmalısın.', ephemeral: true });


    const commandsByCategory = new Map();
    
    const commandTypes = new Map();
    
    client.prefixCommands.forEach(cmd => {
      if (!cmd.category || !cmd.name) return;
      
      const category = cmd.category;
      if (!commandsByCategory.has(category)) {
        commandsByCategory.set(category, []);
      }
      
      const existing = commandsByCategory.get(category).find(c => c.name === cmd.name);
      if (existing) {
        existing.hasPrefix = true;
        existing.types = existing.types || new Set();
        existing.types.add('prefix');
      } else {
        commandsByCategory.get(category).push({
          name: cmd.name,
          description: cmd.description || 'Açıklama yok',
          hasPrefix: true,
          hasSlash: false,
          types: new Set(['prefix'])
        });
      }
      
      if (!commandTypes.has(cmd.name)) {
        commandTypes.set(cmd.name, new Set());
      }
      commandTypes.get(cmd.name).add('prefix');
    });

    client.slashCommands.forEach(cmd => {
      if (!cmd.name) return;
      const category = cmd.category || 'extra';
      
      if (!commandsByCategory.has(category)) {
        commandsByCategory.set(category, []);
      }
      
      const existing = commandsByCategory.get(category).find(c => c.name === cmd.name);
      if (existing) {
        existing.hasSlash = true;
        existing.types = existing.types || new Set();
        existing.types.add('slash');
      } else {
        commandsByCategory.get(category).push({
          name: cmd.name,
          description: cmd.description || cmd.data?.description || 'Açıklama yok',
          hasPrefix: false,
          hasSlash: true,
          types: new Set(['slash'])
        });
      }
      
      if (!commandTypes.has(cmd.name)) {
        commandTypes.set(cmd.name, new Set());
      }
      commandTypes.get(cmd.name).add('slash');
    });

    const categories = [
      { label: 'Economy Komutları', value: 'economy', emoji: '💰', exists: commandsByCategory.has('economy') },
      { label: 'Moderasyon Komutları', value: 'moderation', emoji: '⚖️', exists: commandsByCategory.has('moderation') },
      { label: 'Kayıt Komutları', value: 'register', emoji: '📝', exists: commandsByCategory.has('register') },
      { label: 'Level Komutları', value: 'level', emoji: '📊', exists: commandsByCategory.has('level') },
      { label: 'Davet Komutları', value: 'invite', emoji: '🎫', exists: commandsByCategory.has('invite') },
      { label: 'Kullanıcı Komutları', value: 'user', emoji: '👤', exists: commandsByCategory.has('user') },
      { label: 'Sunucu Komutları', value: 'server', emoji: '🏠', exists: commandsByCategory.has('server') },
      { label: 'Setup Komutları', value: 'setup', emoji: '⚙️', exists: commandsByCategory.has('setup') },
      { label: 'Eğlence Komutları', value: 'fun', emoji: '🎮', exists: commandsByCategory.has('fun') },
      { label: 'İstatistik Komutları', value: 'stat', emoji: '📈', exists: commandsByCategory.has('stat') },
      { label: 'Ekstra Komutlar', value: 'extra', emoji: '✨', exists: commandsByCategory.has('extra') }
    ].filter(cat => cat.exists);

    if (categories.length === 0) {
      return message.reply('❌ Kategoriye sahip komut bulunamadı!');
    }

    const categoryEmbed = new EmbedBuilder()
      .setTitle('📋 Komut Paneli')
      .setDescription('Bir kategori seçerek komutların ayarlarını düzenleyebilirsiniz.\n\n**Özellikler:**\n• Kanal kısıtlaması (whitelist/blacklist)\n• Rol kısıtlaması (whitelist/blacklist)\n• Kullanıcı kısıtlaması (whitelist/blacklist)\n• Otomatik mesaj silme')
      .setColor('#5865F2')
      .setFooter({ text: `${categories.length} kategori mevcut` });

    const categorySelect = new StringSelectMenuBuilder()
      .setCustomId('category_select')
      .setPlaceholder('Bir kategori seçin...')
      .addOptions(categories.slice(0, 25).map(cat => ({
        label: cat.label,
        value: cat.value,
        emoji: cat.emoji
      })));

    const closeButton = new ButtonBuilder()
      .setCustomId('close_panel')
      .setLabel('Kapat')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️');

    const buttonRow = new ActionRowBuilder().addComponents(closeButton);

    const reply = await message.reply({
      embeds: [categoryEmbed],
      components: [new ActionRowBuilder().addComponents(categorySelect), buttonRow]
    });

    // Collector
    const collector = reply.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time: 300000 
    });

    collector.on('collect', async interaction => {
      try {
        if (interaction.customId === 'close_panel') {
          await interaction.update({ components: [] });
          collector.stop();
          return;
        }

        if (interaction.customId === 'category_select') {
          const category = interaction.values[0];
          const commands = commandsByCategory.get(category);
          
          if (!commands || commands.length === 0) {
            return interaction.reply({ 
              content: '❌ Bu kategoride komut bulunamadı!', 
              flags: MessageFlags.Ephemeral 
            });
          }

          const commandEmbed = new EmbedBuilder()
            .setTitle(`📋 ${categories.find(c => c.value === category)?.label}`)
            .setDescription('Ayarlamak istediğiniz komutu seçin:')
            .setColor('#5865F2');

          const uniqueCommands = [];
          const seenNames = new Set();
          
          commands.forEach(cmd => {
            if (!seenNames.has(cmd.name)) {
              seenNames.add(cmd.name);
              uniqueCommands.push(cmd);
            }
          });

          const commandSelect = new StringSelectMenuBuilder()
            .setCustomId('command_select')
            .setPlaceholder('Bir komut seçin...')
            .addOptions(uniqueCommands.slice(0, 25).map(cmd => {
              let typeLabel = '';
              if (cmd.hasPrefix && cmd.hasSlash) typeLabel = ' [PREFIX+SLASH]';
              else if (cmd.hasPrefix) typeLabel = ' [PREFIX]';
              else if (cmd.hasSlash) typeLabel = ' [SLASH]';
              
              return {
                label: `${cmd.name}${typeLabel}`,
                value: cmd.name,
                description: cmd.description.substring(0, 100)
              };
            }));

          const backButton = new ButtonBuilder()
            .setCustomId('back_to_category')
            .setLabel('Geri')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('◀️');

          await interaction.update({
            embeds: [commandEmbed],
            components: [
              new ActionRowBuilder().addComponents(commandSelect),
              new ActionRowBuilder().addComponents(backButton, closeButton)
            ]
          });
        }

        if (interaction.customId === 'command_select') {
          const commandName = interaction.values[0];
          
          let settings = await CommandSettings.findOne({ 
            guildId: message.guild.id, 
            commandName 
          });

          if (!settings) {
            settings = new CommandSettings({
              guildId: message.guild.id,
              commandName,
              enabled: true
            });
            await settings.save();
          }

          let commandInfo = null;
          for (const [, cmds] of commandsByCategory) {
            const found = cmds.find(c => c.name === commandName);
            if (found) { commandInfo = found; break; }
          }

          const settingsEmbed = createSettingsEmbed(commandName, settings, message.guild, commandInfo);
          const components = createSettingsComponents(settings);

          await interaction.update({
            embeds: [settingsEmbed],
            components
          });
        }

        if (interaction.customId === 'channel_mode') {
          await handleChannelMode(interaction, message.guild, commandsByCategory);
        }

        if (interaction.customId === 'role_mode') {
          await handleRoleMode(interaction, message.guild, commandsByCategory);
        }

        if (interaction.customId === 'user_mode') {
          await handleUserMode(interaction, message.guild, commandsByCategory);
        }

        if (interaction.customId === 'channel_select') {
          await handleChannelSelect(interaction, message.guild, commandsByCategory);
        }

        if (interaction.customId === 'role_select') {
          await handleRoleSelect(interaction, message.guild, commandsByCategory);
        }

        if (interaction.customId === 'user_select') {
          await handleUserSelect(interaction, message.guild, commandsByCategory);
        }

        if (interaction.customId === 'toggle_enabled') {
          await handleToggleEnabled(interaction, message.guild, commandsByCategory);
        }

        if (interaction.customId === 'reset_settings') {
          await handleResetSettings(interaction, message.guild, commandsByCategory);
        }

        if (interaction.customId === 'remove_channel_button') {
          await openChannelRemove(interaction, message.guild, commandsByCategory);
        }
        if (interaction.customId === 'remove_channel_select') {
          await confirmChannelRemove(interaction, message.guild, commandsByCategory);
        }
        if (interaction.customId === 'remove_role_button') {
          await openRoleRemove(interaction, message.guild, commandsByCategory);
        }
        if (interaction.customId === 'remove_role_select') {
          await confirmRoleRemove(interaction, message.guild, commandsByCategory);
        }
        if (interaction.customId === 'remove_user_button') {
          await openUserRemove(interaction, message.guild, commandsByCategory);
        }
        if (interaction.customId === 'remove_user_select') {
          await confirmUserRemove(interaction, message.guild, commandsByCategory);
        }

        if (interaction.customId === 'back_to_category') {
          await interaction.update({
            embeds: [categoryEmbed],
            components: [new ActionRowBuilder().addComponents(categorySelect), buttonRow]
          });
        }

      } catch (error) {
        console.error('Komut paneli hatası:', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ 
            content: '❌ Bir hata oluştu!', 
            flags: MessageFlags.Ephemeral 
          }).catch(() => {});
        }
      }
    });

    collector.on('end', () => {
      reply.edit({ components: [] }).catch(() => {});
    });
  }
};

function createSettingsEmbed(commandName, settings, guild, commandInfo) {
  const embed = new EmbedBuilder()
    .setTitle(`⚙️ Komut Ayarları — ${commandName}`)
    .setColor(settings.enabled ? '#5865F2' : '#ED4245')
    .setTimestamp();

  if (commandInfo) {
    const types = [];
    if (commandInfo.hasPrefix) types.push('📝 Prefix');
    if (commandInfo.hasSlash) types.push('⚡ Slash');
    embed.addFields({ name: '🔖 Komut Türü', value: types.join(' + ') || 'Bilinmiyor', inline: true });
  }

  let channelText = '❌ Kapalı (Tüm kanallarda kullanılabilir)';
  if (settings.channelMode === 'whitelist') {
    if (!settings.allowedChannels || settings.allowedChannels.length === 0) {
      channelText = `✅ **Whitelist** — ⚠️ Henüz kanal seçilmedi`;
    } else {
      const chunks = chunkArray(settings.allowedChannels, 20);
      channelText = `✅ **Whitelist** — Sadece şu **${settings.allowedChannels.length}** kanalda:\n${chunks[0].map(id => `<#${id}>`).join(', ')}`;
      if (chunks.length > 1) channelText += ` +${settings.allowedChannels.length - 20} tane daha`;
    }
  } else if (settings.channelMode === 'blacklist') {
    if (!settings.blockedChannels || settings.blockedChannels.length === 0) {
      channelText = `🚫 **Blacklist** — ⚠️ Henüz kanal seçilmedi`;
    } else {
      const chunks = chunkArray(settings.blockedChannels, 20);
      channelText = `🚫 **Blacklist** — Şu **${settings.blockedChannels.length}** kanal hariç:\n${chunks[0].map(id => `<#${id}>`).join(', ')}`;
      if (chunks.length > 1) channelText += ` +${settings.blockedChannels.length - 20} tane daha`;
    }
  }
  embed.addFields({ name: '📺 Kanal Kısıtlaması', value: channelText, inline: false });

  let roleText = '❌ Kapalı (Tüm roller kullanabilir)';
  if (settings.roleMode === 'whitelist') {
    if (!settings.allowedRoles || settings.allowedRoles.length === 0) {
      roleText = `✅ **Whitelist** — ⚠️ Henüz rol seçilmedi`;
    } else {
      const chunks = chunkArray(settings.allowedRoles, 20);
      roleText = `✅ **Whitelist** — Sadece şu **${settings.allowedRoles.length}** rol:\n${chunks[0].map(id => `<@&${id}>`).join(', ')}`;
      if (chunks.length > 1) roleText += ` +${settings.allowedRoles.length - 20} tane daha`;
    }
  } else if (settings.roleMode === 'blacklist') {
    if (!settings.blockedRoles || settings.blockedRoles.length === 0) {
      roleText = `🚫 **Blacklist** — ⚠️ Henüz rol seçilmedi`;
    } else {
      const chunks = chunkArray(settings.blockedRoles, 20);
      roleText = `🚫 **Blacklist** — Şu **${settings.blockedRoles.length}** rol hariç:\n${chunks[0].map(id => `<@&${id}>`).join(', ')}`;
      if (chunks.length > 1) roleText += ` +${settings.blockedRoles.length - 20} tane daha`;
    }
  }
  embed.addFields({ name: '🎭 Rol Kısıtlaması', value: roleText, inline: false });

  let userText = '❌ Kapalı (Tüm üyeler kullanabilir)';
  if (settings.userMode === 'whitelist') {
    if (!settings.allowedUsers || settings.allowedUsers.length === 0) {
      userText = `✅ **Whitelist** — ⚠️ Henüz üye seçilmedi`;
    } else {
      const chunks = chunkArray(settings.allowedUsers, 20);
      userText = `✅ **Whitelist** — Sadece şu **${settings.allowedUsers.length}** üye:\n${chunks[0].map(id => `<@${id}>`).join(', ')}`;
      if (chunks.length > 1) userText += ` +${settings.allowedUsers.length - 20} tane daha`;
    }
  } else if (settings.userMode === 'blacklist') {
    if (!settings.blockedUsers || settings.blockedUsers.length === 0) {
      userText = `🚫 **Blacklist** — ⚠️ Henüz üye seçilmedi`;
    } else {
      const chunks = chunkArray(settings.blockedUsers, 20);
      userText = `🚫 **Blacklist** — Şu **${settings.blockedUsers.length}** üye hariç:\n${chunks[0].map(id => `<@${id}>`).join(', ')}`;
      if (chunks.length > 1) userText += ` +${settings.blockedUsers.length - 20} tane daha`;
    }
  }
  embed.addFields({ name: '👤 Üye Kısıtlaması', value: userText, inline: false });

  const statusText = settings.enabled ? '✅ Aktif' : '❌ Pasif';
  embed.addFields({ name: '🔘 Durum', value: statusText, inline: true });

  return embed;
}

function createSettingsComponents(settings, opts = {}) {
  const { hideRemoveButtons = false } = opts;

  const channelModeSelect = new StringSelectMenuBuilder()
    .setCustomId('channel_mode')
    .setPlaceholder('Kanal kısıtlama modu seçin...')
    .addOptions([
      { label: 'Kapalı', value: 'off', description: 'Tüm kanallarda kullanılabilir', emoji: '❌' },
      { label: 'Whitelist', value: 'whitelist', description: 'Sadece seçili kanallarda', emoji: '✅' },
      { label: 'Blacklist', value: 'blacklist', description: 'Seçili kanallar hariç', emoji: '🚫' }
    ]);

  const roleModeSelect = new StringSelectMenuBuilder()
    .setCustomId('role_mode')
    .setPlaceholder('Rol kısıtlama modu seçin...')
    .addOptions([
      { label: 'Kapalı', value: 'off', description: 'Tüm roller kullanabilir', emoji: '❌' },
      { label: 'Whitelist', value: 'whitelist', description: 'Sadece seçili roller', emoji: '✅' },
      { label: 'Blacklist', value: 'blacklist', description: 'Seçili roller hariç', emoji: '🚫' }
    ]);

  const userModeSelect = new StringSelectMenuBuilder()
    .setCustomId('user_mode')
    .setPlaceholder('Üye kısıtlama modu seçin...')
    .addOptions([
      { label: 'Kapalı', value: 'off', description: 'Tüm üyeler kullanabilir', emoji: '❌' },
      { label: 'Whitelist', value: 'whitelist', description: 'Sadece seçili üyeler', emoji: '✅' },
      { label: 'Blacklist', value: 'blacklist', description: 'Seçili üyeler hariç', emoji: '🚫' }
    ]);

  const toggleButton = new ButtonBuilder()
    .setCustomId('toggle_enabled')
    .setLabel(settings.enabled ? 'Devre Dışı Bırak' : 'Etkinleştir')
    .setStyle(settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
    .setEmoji(settings.enabled ? '❌' : '✅');

  const resetButton = new ButtonBuilder()
    .setCustomId('reset_settings')
    .setLabel('Sıfırla')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🔄');

  const backButton = new ButtonBuilder()
    .setCustomId('back_to_category')
    .setLabel('Geri')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('◀️');

  const rows = [
    new ActionRowBuilder().addComponents(channelModeSelect),
    new ActionRowBuilder().addComponents(roleModeSelect),
    new ActionRowBuilder().addComponents(userModeSelect),
  ];

  if (!hideRemoveButtons) {
    const removeChannelBtn = new ButtonBuilder()
      .setCustomId('remove_channel_button')
      .setLabel('Kanal Kaldır')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📺');

    const removeRoleBtn = new ButtonBuilder()
      .setCustomId('remove_role_button')
      .setLabel('Rol Kaldır')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🎭');

    const removeUserBtn = new ButtonBuilder()
      .setCustomId('remove_user_button')
      .setLabel('Üye Kaldır')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('👤');

    rows.push(new ActionRowBuilder().addComponents(removeChannelBtn, removeRoleBtn, removeUserBtn));
  }

  rows.push(new ActionRowBuilder().addComponents(toggleButton, resetButton, backButton));

  return rows;
}

async function handleChannelMode(interaction, guild, commandsByCategory) {
  const mode = interaction.values[0];
  const commandName = interaction.message.embeds[0].title.split('— ')[1]?.trim();
  
  let settings = await CommandSettings.findOne({ guildId: guild.id, commandName });
  if (!settings) {
    settings = new CommandSettings({ guildId: guild.id, commandName, enabled: true });
  }
  
  settings.channelMode = mode;
  
  if (mode === 'off') {
    settings.allowedChannels = [];
    settings.blockedChannels = [];
    await settings.save();
    
    let commandInfo = null;
    if (commandsByCategory) {
      for (const [, cmds] of commandsByCategory) {
        const found = cmds.find(c => c.name === commandName);
        if (found) { commandInfo = found; break; }
      }
    }
    
    const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
    const components = createSettingsComponents(settings);
    return interaction.update({ embeds: [embed], components });
  }

  await settings.save();

  const defaultChannels = (mode === 'whitelist' ? settings.allowedChannels : settings.blockedChannels) || [];

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId('channel_select')
    .setPlaceholder(`${mode === 'whitelist' ? '✅ Sadece bu kanallarda kullanılabilir' : '🚫 Bu kanallar hariç her yerde kullanılabilir'}${defaultChannels.length > 0 ? ` · ${defaultChannels.length} kanal kayıtlı` : ''}`)
    .setChannelTypes([ChannelType.GuildText])
    .setMinValues(1)
    .setMaxValues(10);

  if (defaultChannels.length > 0 && typeof channelSelect.setDefaultValues === 'function') {
    try { channelSelect.setDefaultValues(defaultChannels.slice(0, 25)); } catch {}
  }

  let commandInfo = null;
  if (commandsByCategory) {
    for (const [, cmds] of commandsByCategory) {
      const found = cmds.find(c => c.name === commandName);
      if (found) { commandInfo = found; break; }
    }
  }

  const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
  
  const components = [
    new ActionRowBuilder().addComponents(channelSelect),
    ...createSettingsComponents(settings, { hideRemoveButtons: true })
  ];
  
  await interaction.update({ embeds: [embed], components });
}

async function handleRoleMode(interaction, guild, commandsByCategory) {
  const mode = interaction.values[0];
  const commandName = interaction.message.embeds[0].title.split('— ')[1]?.trim();
  
  let settings = await CommandSettings.findOne({ guildId: guild.id, commandName });
  if (!settings) {
    settings = new CommandSettings({ guildId: guild.id, commandName, enabled: true });
  }
  
  settings.roleMode = mode;
  
  if (mode === 'off') {
    settings.allowedRoles = [];
    settings.blockedRoles = [];
    await settings.save();
    
    let commandInfo = null;
    if (commandsByCategory) {
      for (const [, cmds] of commandsByCategory) {
        const found = cmds.find(c => c.name === commandName);
        if (found) { commandInfo = found; break; }
      }
    }
    
    const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
    const components = createSettingsComponents(settings);
    return interaction.update({ embeds: [embed], components });
  }

  await settings.save();

  const defaultRoles = (mode === 'whitelist' ? settings.allowedRoles : settings.blockedRoles) || [];

  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId('role_select')
    .setPlaceholder(`${mode === 'whitelist' ? '✅ Sadece bu rollerdekiler kullanabilir' : '🚫 Bu roller hariç herkes kullanabilir'}${defaultRoles.length > 0 ? ` · ${defaultRoles.length} rol kayıtlı` : ''}`)
    .setMinValues(1)
    .setMaxValues(10);

  if (defaultRoles.length > 0 && typeof roleSelect.setDefaultValues === 'function') {
    try { roleSelect.setDefaultValues(defaultRoles.slice(0, 25)); } catch {}
  }

  let commandInfo = null;
  if (commandsByCategory) {
    for (const [, cmds] of commandsByCategory) {
      const found = cmds.find(c => c.name === commandName);
      if (found) { commandInfo = found; break; }
    }
  }

  const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
  
  const components = [
    new ActionRowBuilder().addComponents(roleSelect),
    ...createSettingsComponents(settings, { hideRemoveButtons: true })
  ];
  
  await interaction.update({ embeds: [embed], components });
}

async function handleUserMode(interaction, guild, commandsByCategory) {
  const mode = interaction.values[0];
  const commandName = interaction.message.embeds[0].title.split('— ')[1]?.trim();
  
  let settings = await CommandSettings.findOne({ guildId: guild.id, commandName });
  if (!settings) {
    settings = new CommandSettings({ guildId: guild.id, commandName, enabled: true });
  }
  
  settings.userMode = mode;
  
  if (mode === 'off') {
    settings.allowedUsers = [];
    settings.blockedUsers = [];
    await settings.save();
    
    let commandInfo = null;
    if (commandsByCategory) {
      for (const [, cmds] of commandsByCategory) {
        const found = cmds.find(c => c.name === commandName);
        if (found) { commandInfo = found; break; }
      }
    }
    
    const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
    const components = createSettingsComponents(settings);
    return interaction.update({ embeds: [embed], components });
  }

  await settings.save();

  const defaultUsers = (mode === 'whitelist' ? settings.allowedUsers : settings.blockedUsers) || [];

  const userSelect = new UserSelectMenuBuilder()
    .setCustomId('user_select')
    .setPlaceholder(`${mode === 'whitelist' ? '✅ Sadece bu üyeler kullanabilir' : '🚫 Bu üyeler hariç herkes kullanabilir'}${defaultUsers.length > 0 ? ` · ${defaultUsers.length} üye kayıtlı` : ''}`)
    .setMinValues(1)
    .setMaxValues(10);

  if (defaultUsers.length > 0 && typeof userSelect.setDefaultValues === 'function') {
    try { userSelect.setDefaultValues(defaultUsers.slice(0, 25)); } catch {}
  }

  let commandInfo = null;
  if (commandsByCategory) {
    for (const [, cmds] of commandsByCategory) {
      const found = cmds.find(c => c.name === commandName);
      if (found) { commandInfo = found; break; }
    }
  }

  const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
  
  const components = [
    new ActionRowBuilder().addComponents(userSelect),
    ...createSettingsComponents(settings, { hideRemoveButtons: true })
  ];
  
  await interaction.update({ embeds: [embed], components });
}

async function handleChannelSelect(interaction, guild, commandsByCategory) {
  const selectedChannels = interaction.values;
  const commandName = interaction.message.embeds[0].title.split('— ')[1]?.trim();
  
  let settings = await CommandSettings.findOne({ guildId: guild.id, commandName });
  
  if (!settings) {
    return interaction.reply({ 
      content: '❌ Önce kanal modunu seçin!', 
      flags: MessageFlags.Ephemeral 
    });
  }
  
  const targetList = settings.channelMode === 'whitelist' 
    ? (settings.allowedChannels || []) 
    : (settings.blockedChannels || []);

  const selectedSet = new Set(selectedChannels);
  const existingSet = new Set(targetList);

  const added = [];
  const removed = [];

  selectedSet.forEach(id => {
    if (existingSet.has(id)) {
      removed.push(id);
      existingSet.delete(id);
    } else {
      added.push(id);
      existingSet.add(id);
    }
  });

  const finalList = [...existingSet];

  if (settings.channelMode === 'whitelist') {
    settings.allowedChannels = finalList;
    settings.blockedChannels = [];
  } else if (settings.channelMode === 'blacklist') {
    settings.blockedChannels = finalList;
    settings.allowedChannels = [];
  }
  
  await settings.save();
  
  const parts = [];
  if (added.length > 0) parts.push(`✅ Eklenen: **${added.length}** kanal`);
  if (removed.length > 0) parts.push(`❌ Kaldırılan: **${removed.length}** kanal`);
  parts.push(`📊 Toplam: **${finalList.length}** kanal`);
  
  await interaction.reply({
    content: parts.join('\n'),
    flags: MessageFlags.Ephemeral
  });
  
  let commandInfo = null;
  if (commandsByCategory) {
    for (const [, cmds] of commandsByCategory) {
      const found = cmds.find(c => c.name === commandName);
      if (found) { commandInfo = found; break; }
    }
  }

  const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
  const components = createSettingsComponents(settings);
  
  await interaction.message.edit({ embeds: [embed], components });
}

async function handleRoleSelect(interaction, guild, commandsByCategory) {
  const selectedRoles = interaction.values;
  const commandName = interaction.message.embeds[0].title.split('— ')[1]?.trim();
  
  let settings = await CommandSettings.findOne({ guildId: guild.id, commandName });
  
  if (!settings) {
    return interaction.reply({ 
      content: '❌ Önce rol modunu seçin!', 
      flags: MessageFlags.Ephemeral 
    });
  }
  
  const targetList = settings.roleMode === 'whitelist'
    ? (settings.allowedRoles || [])
    : (settings.blockedRoles || []);

  const selectedSet = new Set(selectedRoles);
  const existingSet = new Set(targetList);

  const added = [];
  const removed = [];

  selectedSet.forEach(id => {
    if (existingSet.has(id)) {
      removed.push(id);
      existingSet.delete(id);
    } else {
      added.push(id);
      existingSet.add(id);
    }
  });

  const finalList = [...existingSet];

  if (settings.roleMode === 'whitelist') {
    settings.allowedRoles = finalList;
    settings.blockedRoles = [];
  } else if (settings.roleMode === 'blacklist') {
    settings.blockedRoles = finalList;
    settings.allowedRoles = [];
  }
  
  await settings.save();
  
  const parts = [];
  if (added.length > 0) parts.push(`✅ Eklenen: **${added.length}** rol`);
  if (removed.length > 0) parts.push(`❌ Kaldırılan: **${removed.length}** rol`);
  parts.push(`📊 Toplam: **${finalList.length}** rol`);
  
  await interaction.reply({
    content: parts.join('\n'),
    flags: MessageFlags.Ephemeral
  });
  
  let commandInfo = null;
  if (commandsByCategory) {
    for (const [, cmds] of commandsByCategory) {
      const found = cmds.find(c => c.name === commandName);
      if (found) { commandInfo = found; break; }
    }
  }

  const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
  const components = createSettingsComponents(settings);
  
  await interaction.message.edit({ embeds: [embed], components });
}

async function handleUserSelect(interaction, guild, commandsByCategory) {
  const selectedUsers = interaction.values;
  const commandName = interaction.message.embeds[0].title.split('— ')[1]?.trim();
  
  let settings = await CommandSettings.findOne({ guildId: guild.id, commandName });
  
  if (!settings) {
    return interaction.reply({ 
      content: '❌ Önce üye modunu seçin!', 
      flags: MessageFlags.Ephemeral 
    });
  }
  
  const targetList = settings.userMode === 'whitelist'
    ? (settings.allowedUsers || [])
    : (settings.blockedUsers || []);

  const selectedSet = new Set(selectedUsers);
  const existingSet = new Set(targetList);

  const added = [];
  const removed = [];

  selectedSet.forEach(id => {
    if (existingSet.has(id)) {
      removed.push(id);
      existingSet.delete(id);
    } else {
      added.push(id);
      existingSet.add(id);
    }
  });

  const finalList = [...existingSet];

  if (settings.userMode === 'whitelist') {
    settings.allowedUsers = finalList;
    settings.blockedUsers = [];
  } else if (settings.userMode === 'blacklist') {
    settings.blockedUsers = finalList;
    settings.allowedUsers = [];
  }
  
  await settings.save();
  
  const parts = [];
  if (added.length > 0) parts.push(`✅ Eklenen: **${added.length}** üye`);
  if (removed.length > 0) parts.push(`❌ Kaldırılan: **${removed.length}** üye`);
  parts.push(`📊 Toplam: **${finalList.length}** üye`);
  
  await interaction.reply({
    content: parts.join('\n'),
    flags: MessageFlags.Ephemeral
  });
  
  let commandInfo = null;
  if (commandsByCategory) {
    for (const [, cmds] of commandsByCategory) {
      const found = cmds.find(c => c.name === commandName);
      if (found) { commandInfo = found; break; }
    }
  }

  const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
  const components = createSettingsComponents(settings);
  
  await interaction.message.edit({ embeds: [embed], components });
}

async function handleToggleEnabled(interaction, guild, commandsByCategory) {
  const commandName = interaction.message.embeds[0].title.split('— ')[1]?.trim();
  
  let settings = await CommandSettings.findOne({ guildId: guild.id, commandName });
  if (!settings) {
    settings = new CommandSettings({ guildId: guild.id, commandName });
  }
  
  settings.enabled = !settings.enabled;
  await settings.save();
  
  let commandInfo = null;
  if (commandsByCategory) {
    for (const [, cmds] of commandsByCategory) {
      const found = cmds.find(c => c.name === commandName);
      if (found) { commandInfo = found; break; }
    }
  }

  const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
  const components = createSettingsComponents(settings);
  
  await interaction.update({ embeds: [embed], components });
}

async function handleResetSettings(interaction, guild, commandsByCategory) {
  const commandName = interaction.message.embeds[0].title.split('— ')[1]?.trim();
  
  await CommandSettings.deleteOne({ guildId: guild.id, commandName });
  
  await interaction.reply({ 
    content: '🔄 Ayarlar sıfırlandı!', 
    flags: MessageFlags.Ephemeral 
  });
  
  let commandInfo = null;
  if (commandsByCategory) {
    for (const [, cmds] of commandsByCategory) {
      const found = cmds.find(c => c.name === commandName);
      if (found) { commandInfo = found; break; }
    }
  }

  const settings = new CommandSettings({ guildId: guild.id, commandName });
  const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
  const components = createSettingsComponents(settings);
  
  await interaction.message.edit({ embeds: [embed], components });
}

// ============ YARDIMCI FONKSİYONLAR ============

function chunkArray(arr, size) {
  if (!arr) return [];
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ============ KALDIRMA İŞLEMLERİ (Remove Mode) ============

async function openChannelRemove(interaction, guild, commandsByCategory) {
  const commandName = interaction.message.embeds[0].title.split('— ')[1]?.trim();
  const settings = await CommandSettings.findOne({ guildId: guild.id, commandName });
  
  if (!settings) {
    return interaction.reply({ content: '❌ Ayar bulunamadı!', flags: MessageFlags.Ephemeral });
  }

  const currentList = settings.channelMode === 'whitelist'
    ? (settings.allowedChannels || [])
    : (settings.blockedChannels || []);

  if (!currentList || currentList.length === 0) {
    return interaction.reply({ content: '❌ Kaldırılacak kanal yok!', flags: MessageFlags.Ephemeral });
  }

  const options = [];
  for (const id of currentList.slice(0, 25)) {
    const ch = guild.channels.cache.get(id);
    options.push({
      label: ch ? `#${ch.name}` : `#bilinmeyen-${id.slice(-4)}`,
      value: id,
      emoji: '📺'
    });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('remove_channel_select')
    .setPlaceholder('Kaldırmak istediğiniz kanalları seçin...')
    .setMinValues(1)
    .setMaxValues(options.length)
    .addOptions(options);

  const commandInfo = findCommandInfo(commandsByCategory, commandName);
  const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
  
  const components = [
    new ActionRowBuilder().addComponents(select),
    ...createSettingsComponents(settings, { hideRemoveButtons: true })
  ];

  await interaction.update({ embeds: [embed], components });
}

async function confirmChannelRemove(interaction, guild, commandsByCategory) {
  const selected = interaction.values;
  const commandName = interaction.message.embeds[0].title.split('— ')[1]?.trim();
  const settings = await CommandSettings.findOne({ guildId: guild.id, commandName });

  if (!settings) return;

  if (settings.channelMode === 'whitelist') {
    settings.allowedChannels = (settings.allowedChannels || []).filter(id => !selected.includes(id));
  } else if (settings.channelMode === 'blacklist') {
    settings.blockedChannels = (settings.blockedChannels || []).filter(id => !selected.includes(id));
  }
  await settings.save();

  await interaction.reply({
    content: `🗑️ **${selected.length}** kanal kaldırıldı!`,
    flags: MessageFlags.Ephemeral
  });

  const commandInfo = findCommandInfo(commandsByCategory, commandName);
  const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
  const components = createSettingsComponents(settings);

  await interaction.message.edit({ embeds: [embed], components });
}

async function openRoleRemove(interaction, guild, commandsByCategory) {
  const commandName = interaction.message.embeds[0].title.split('— ')[1]?.trim();
  const settings = await CommandSettings.findOne({ guildId: guild.id, commandName });

  if (!settings) {
    return interaction.reply({ content: '❌ Ayar bulunamadı!', flags: MessageFlags.Ephemeral });
  }

  const currentList = settings.roleMode === 'whitelist'
    ? (settings.allowedRoles || [])
    : (settings.blockedRoles || []);

  if (!currentList || currentList.length === 0) {
    return interaction.reply({ content: '❌ Kaldırılacak rol yok!', flags: MessageFlags.Ephemeral });
  }

  const options = [];
  for (const id of currentList.slice(0, 25)) {
    const r = guild.roles.cache.get(id);
    options.push({
      label: r ? `@${r.name}` : `@silinmis-rol-${id.slice(-4)}`,
      value: id,
      emoji: '🎭'
    });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('remove_role_select')
    .setPlaceholder('Kaldırmak istediğiniz rolleri seçin...')
    .setMinValues(1)
    .setMaxValues(options.length)
    .addOptions(options);

  const commandInfo = findCommandInfo(commandsByCategory, commandName);
  const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);

  const components = [
    new ActionRowBuilder().addComponents(select),
    ...createSettingsComponents(settings, { hideRemoveButtons: true })
  ];

  await interaction.update({ embeds: [embed], components });
}

async function confirmRoleRemove(interaction, guild, commandsByCategory) {
  const selected = interaction.values;
  const commandName = interaction.message.embeds[0].title.split('— ')[1]?.trim();
  const settings = await CommandSettings.findOne({ guildId: guild.id, commandName });

  if (!settings) return;

  if (settings.roleMode === 'whitelist') {
    settings.allowedRoles = (settings.allowedRoles || []).filter(id => !selected.includes(id));
  } else if (settings.roleMode === 'blacklist') {
    settings.blockedRoles = (settings.blockedRoles || []).filter(id => !selected.includes(id));
  }
  await settings.save();

  await interaction.reply({
    content: `🗑️ **${selected.length}** rol kaldırıldı!`,
    flags: MessageFlags.Ephemeral
  });

  const commandInfo = findCommandInfo(commandsByCategory, commandName);
  const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
  const components = createSettingsComponents(settings);

  await interaction.message.edit({ embeds: [embed], components });
}

async function openUserRemove(interaction, guild, commandsByCategory) {
  const commandName = interaction.message.embeds[0].title.split('— ')[1]?.trim();
  const settings = await CommandSettings.findOne({ guildId: guild.id, commandName });

  if (!settings) {
    return interaction.reply({ content: '❌ Ayar bulunamadı!', flags: MessageFlags.Ephemeral });
  }

  const currentList = settings.userMode === 'whitelist'
    ? (settings.allowedUsers || [])
    : (settings.blockedUsers || []);

  if (!currentList || currentList.length === 0) {
    return interaction.reply({ content: '❌ Kaldırılacak üye yok!', flags: MessageFlags.Ephemeral });
  }

  const options = [];
  for (const id of currentList.slice(0, 25)) {
    const m = guild.members.cache.get(id);
    options.push({
      label: m ? `${m.user.username} (${m.displayName})` : `id-${id.slice(-6)}`,
      value: id,
      emoji: '👤'
    });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('remove_user_select')
    .setPlaceholder('Kaldırmak istediğiniz üyeleri seçin...')
    .setMinValues(1)
    .setMaxValues(options.length)
    .addOptions(options);

  const commandInfo = findCommandInfo(commandsByCategory, commandName);
  const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);

  const components = [
    new ActionRowBuilder().addComponents(select),
    ...createSettingsComponents(settings, { hideRemoveButtons: true })
  ];

  await interaction.update({ embeds: [embed], components });
}

async function confirmUserRemove(interaction, guild, commandsByCategory) {
  const selected = interaction.values;
  const commandName = interaction.message.embeds[0].title.split('— ')[1]?.trim();
  const settings = await CommandSettings.findOne({ guildId: guild.id, commandName });

  if (!settings) return;

  if (settings.userMode === 'whitelist') {
    settings.allowedUsers = (settings.allowedUsers || []).filter(id => !selected.includes(id));
  } else if (settings.userMode === 'blacklist') {
    settings.blockedUsers = (settings.blockedUsers || []).filter(id => !selected.includes(id));
  }
  await settings.save();

  await interaction.reply({
    content: `🗑️ **${selected.length}** üye kaldırıldı!`,
    flags: MessageFlags.Ephemeral
  });

  const commandInfo = findCommandInfo(commandsByCategory, commandName);
  const embed = createSettingsEmbed(commandName, settings, guild, commandInfo);
  const components = createSettingsComponents(settings);

  await interaction.message.edit({ embeds: [embed], components });
}

function findCommandInfo(commandsByCategory, commandName) {
  if (!commandsByCategory) return null;
  for (const [, cmds] of commandsByCategory) {
    const found = cmds.find(c => c.name === commandName);
    if (found) return found;
  }
  return null;
}
