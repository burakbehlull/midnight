import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  PermissionFlagsBits
} from 'discord.js';

import { Settings, ModLogConfig, GuildPermission } from '#models';
import { SETTING_PAGES, findSlot } from './settingsCatalog.js';

const COLORS = {
  main: '#5865F2',
  ok: '#57F287',
  warn: '#FEE75C',
  err: '#ED4245'
};

const PANEL_TIMEOUT = 5 * 60 * 1000;

function readPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function writePath(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  let target = obj;
  for (const p of parts) target = target[p];
  target[last] = value;
}

function truncate(text, max = 100) {
  const str = String(text ?? '');
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

function sourceDoc(ctx, slot) {
  return slot.source === 'modlog' ? ctx.modlog : ctx.settings;
}

function displayValue(ctx, slot) {
  const raw = readPath(sourceDoc(ctx, slot), slot.key);
  switch (slot.type) {
    case 'toggle':
      return raw ? 'Açık' : '❌ Kapalı';
    case 'choice': {
      const found = slot.choices?.find(c => c.value === raw);
      return found ? found.label : '❌ Ayarlanmamış';
    }
    case 'role':
      return raw ? `<@&${raw}>` : '❌ Yok';
    case 'channel':
      return raw ? `<#${raw}>` : '❌ Yok';
    case 'text':
      return raw ? `\`${raw}\`` : '❌ Yok';
    default:
      return raw == null ? '❌ Yok' : String(raw);
  }
}

function backRow(customId = 'sp_back', label = '◀️ Geri') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Secondary)
  );
}

function closeButton() {
  return new ButtonBuilder().setCustomId('sp_close').setLabel('Kapat').setStyle(ButtonStyle.Danger).setEmoji('🗑️');
}


async function stillAuthorized(ctx) {
  try {
    const member = ctx.message.member;
    if (!member) return false;
    if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
    return await ctx.manager.authority.checkOwnerAndBotOwners();
  } catch {
    return false;
  }
}

async function renderView(ctx) {
  switch (ctx.state.page) {
    case 'server':
    case 'roles':
    case 'modlog':
      return renderSettingPage(ctx, ctx.state.page);
    case 'auth':
      return await renderAuth(ctx);
    default:
      return renderMain(ctx);
  }
}

function withNote(ctx, embed) {
  if (ctx.note) {
    embed.setDescription(`${ctx.note}\n\n${embed.data.description || ''}`.trim());
    ctx.note = null;
  }
  return embed;
}

function renderMain(ctx) {
  const lines = Object.values(SETTING_PAGES)
    .map(p => `${p.emoji} **${p.label}** — ${p.short}`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor(COLORS.main)
    .setTitle('⚙️ Sunucu Paneli')
    .setDescription(
      'Sunucunun tüm ayarlarını tek yerden yönet.\n\n' +
      lines + '\n' +
      '**Yetki Ayarları** — Güvenli kişi/rol ve komut yetki sistemleri'
    )
    .setFooter({ text: ctx.message.guild.name, iconURL: ctx.message.guild.iconURL() || undefined })
    .setTimestamp();

  const options = [
    ...Object.values(SETTING_PAGES).map(p => ({ label: p.label, value: p.id, emoji: p.emoji })),
    { label: 'Yetki Ayarları', value: 'auth', emoji: '🛡️' }
  ];

  const select = new StringSelectMenuBuilder()
    .setCustomId('sp_category')
    .setPlaceholder('Bir bölüm seçin...')
    .addOptions(options);

  const rows = [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(closeButton())
  ];

  return { embeds: [withNote(ctx, embed)], components: rows };
}

function renderSettingPage(ctx, pageId) {
  const page = SETTING_PAGES[pageId];
  const summary = page.slots
    .map(s => `**${s.label}:** ${displayValue(ctx, s)}`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor(COLORS.main)
    .setTitle(page.title)
    .setDescription(`${page.description}\n\n${summary}`)
    .setTimestamp();

  const slotSelect = new StringSelectMenuBuilder()
    .setCustomId('sp_slot')
    .setPlaceholder('Değiştirmek istediğin ayarı seç...')
    .addOptions(page.slots.slice(0, 25).map(s => ({
      label: s.label,
      value: s.key,
      description: truncate(displayValue(ctx, s).replace(/[*`<>@&#]/g, ''), 90)
    })));

  const rows = [new ActionRowBuilder().addComponents(slotSelect)];

  if (ctx.state.slot) {
    const slot = findSlot(pageId, ctx.state.slot);
    if (slot) {
      rows.push(...buildValueRows(ctx, slot));
      return { embeds: [withNote(ctx, embed)], components: rows };
    }
  }

  rows.push(backRow());
  return { embeds: [withNote(ctx, embed)], components: rows };
}

function buildValueRows(ctx, slot) {
  const rows = [];

  if (slot.type === 'toggle') {
    const isOn = Boolean(readPath(sourceDoc(ctx, slot), slot.key));
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`sp_toggle:${slot.key}`)
        .setLabel(isOn ? 'Kapat' : 'Aç')
        .setEmoji(isOn ? '❌' : '✅')
        .setStyle(isOn ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder().setCustomId('sp_back').setLabel('◀️ Geri').setStyle(ButtonStyle.Secondary)
    ));
    return rows;
  }

  if (slot.type === 'text') {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`sp_text:${slot.key}`).setLabel('✏️ Değeri Düzenle').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('sp_back').setLabel('◀️ Geri').setStyle(ButtonStyle.Secondary)
    ));
    return rows;
  }

  if (slot.type === 'choice') {
    const current = readPath(sourceDoc(ctx, slot), slot.key);
    const select = new StringSelectMenuBuilder()
      .setCustomId(`sp_choice:${slot.key}`)
      .setPlaceholder(`${slot.label} seçin...`)
      .addOptions(slot.choices.map(c => ({
        label: c.label,
        value: c.value,
        default: c.value === current
      })));
    rows.push(new ActionRowBuilder().addComponents(select));
    rows.push(backRow());
    return rows;
  }

  if (slot.type === 'role') {
    const current = readPath(sourceDoc(ctx, slot), slot.key);
    const select = new RoleSelectMenuBuilder()
      .setCustomId(`sp_role:${slot.key}`)
      .setPlaceholder(`${slot.label} seçin...`)
      .setMinValues(1)
      .setMaxValues(1);
    if (current) {
      try { if (typeof select.setDefaultValues === 'function') select.setDefaultValues(current); } catch { }
    }
    rows.push(new ActionRowBuilder().addComponents(select));
    rows.push(backRow());
    return rows;
  }

  if (slot.type === 'channel') {
    const current = readPath(sourceDoc(ctx, slot), slot.key);
    const select = new ChannelSelectMenuBuilder()
      .setCustomId(`sp_channel:${slot.key}`)
      .setPlaceholder(`${slot.label} seçin...`)
      .setChannelTypes([ChannelType.GuildText])
      .setMinValues(1)
      .setMaxValues(1);
    if (current) {
      try { if (typeof select.setDefaultValues === 'function') select.setDefaultValues(current); } catch { }
    }
    rows.push(new ActionRowBuilder().addComponents(select));
    rows.push(backRow());
    return rows;
  }

  return rows;
}

function listText(ids, formatter, empty = '❌ Yok') {
  if (!ids || ids.length === 0) return empty;
  const shown = ids.slice(0, 15).map(formatter).join(', ');
  return ids.length > 15 ? `${shown} +${ids.length - 15} tane daha` : shown;
}

function renderAuth(ctx) {
  const gp = ctx.guildPermission;

  const embed = new EmbedBuilder()
    .setColor(COLORS.main)
    .setTitle('🛡️ Yetki Ayarları')
    .setDescription(
      'Güvenli kullanıcı/rol sistemlerini ve komut bazlı yetki sistemini yönet.\n' +
      'Butonlarla sistemleri aç/kapat, menülerle güvenli kişi/rol ekle-çıkar.'
    )
    .addFields(
      { name: '👤 Güvenli Kişiler Sistemi', value: gp.isOwners ? 'Açık' : '❌ Kapalı', inline: true },
      { name: '🎭 Güvenli Roller Sistemi', value: gp.isRole ? 'Açık' : '❌ Kapalı', inline: true },
      { name: '⚙️ Komut Yetki Sistemi', value: gp.isAuthority ? 'Açık' : '❌ Kapalı', inline: true },
      { name: `👥 Güvenli Kullanıcılar (${gp.owners.length})`, value: listText(gp.owners, id => `<@${id}>`), inline: false },
      { name: `🎭 Güvenli Roller (${gp.roles.length})`, value: listText(gp.roles, id => `<@&${id}>`), inline: false }
    )
    .setTimestamp();

  const toggleRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sp_auth_tgl_owners').setLabel('Güvenli Kişiler').setEmoji('👤')
      .setStyle(gp.isOwners ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sp_auth_tgl_role').setLabel('Güvenli Roller').setEmoji('🎭')
      .setStyle(gp.isRole ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sp_auth_tgl_authority').setLabel('Komut Yetki').setEmoji('⚙️')
      .setStyle(gp.isAuthority ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  const roleRow = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('sp_auth_saferoles')
      .setPlaceholder('Güvenli rol ekle/çıkar (tekrar seçmek çıkarır)')
      .setMinValues(1).setMaxValues(10)
  );

  const userRow = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId('sp_auth_safeusers')
      .setPlaceholder('Güvenli kullanıcı ekle/çıkar (tekrar seçmek çıkarır)')
      .setMinValues(1).setMaxValues(10)
  );

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sp_auth_menu').setLabel('🔙 Menü').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sp_close').setLabel('Kapat').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
  );

  return { embeds: [withNote(ctx, embed)], components: [toggleRow, roleRow, userRow, navRow] };
}

async function refresh(ctx) {
  const view = await renderView(ctx);
  await ctx.panel.edit(view).catch(() => {});
}

async function handleInteraction(ctx, i) {
  const [id, ...idArgs] = i.customId.split(':');
  const slotKey = idArgs.join(':') || ctx.state.slot;

  if (id === 'sp_category') {
    const value = i.values[0];
    ctx.state.page = value;
    ctx.state.slot = null;
    await i.update(await renderView(ctx));
    return;
  }

  if (id === 'sp_slot') {
    ctx.state.slot = i.values[0];
    await i.update(await renderView(ctx));
    return;
  }

  if (id === 'sp_back') {
    if (ctx.state.slot) ctx.state.slot = null;
    else ctx.state.page = 'main';
    await i.update(await renderView(ctx));
    return;
  }

  if (id === 'sp_close') {
    await i.update({ components: [] }).catch(() => {});
    ctx.collector?.stop('closed');
    return;
  }

  if (id === 'sp_toggle') {
    const slot = findSlot(ctx.state.page, slotKey);
    if (slot) {
      const doc = sourceDoc(ctx, slot);
      const next = !readPath(doc, slot.key);
      writePath(doc, slot.key, next);
      await doc.save();

      let warn = '';
      if (next) {
        if (slot.key === 'inviteLogStatus' && !ctx.settings.inviteLogChannelId) {
          warn = '\n⚠️ Davet sistemi açıldı ama davet log kanalı ayarlanmamış. **Roller & Kanallar** bölümünden ayarla.';
        } else if (slot.key === 'otorolStatus' && !ctx.settings.autoRoleId) {
          warn = '\n⚠️ Otorol sistemi açıldı ama otorol rolü ayarlanmamış. **Roller & Kanallar** bölümünden ayarla.';
        } else if (slot.key === 'tagRoleStatus' && !ctx.settings.tagRoleId) {
          warn = '\n⚠️ Tag Role sistemi açıldı ama tag rolü ayarlanmamış. **Roller & Kanallar** bölümünden ayarla.';
        } else if (slot.key === 'spotifyMatchEnabled' && !ctx.settings.spotifyMatchChannelId) {
          warn = '\n⚠️ Spotify eşleşme sistemi açıldı ama kanal ayarlanmamış. **Roller & Kanallar** bölümünden ayarla.';
        }
      }

      ctx.note = `${next ? '✅' : '❌'} **${slot.label}** ${next ? 'açıldı' : 'kapatıldı'}.${warn}`;
    }
    await i.update(await renderView(ctx));
    return;
  }

  if (id === 'sp_choice') {
    const slot = findSlot(ctx.state.page, slotKey);
    if (slot) {
      const doc = sourceDoc(ctx, slot);
      const value = i.values[0];
      writePath(doc, slot.key, value);
      await doc.save();
      const label = slot.choices.find(c => c.value === value)?.label || value;
      let warn = '';
      if (slot.key === 'registerFormat' && (value === 'tag_isim' || value === 'tag_isim_yas') && !ctx.settings.tag) {
        warn = '\n⚠️ Bu format tag gerektirir ama sunucuda tag ayarlanmamış. Önce **Tag** ayarını yap.';
      }
      if (slot.key === 'registerMode' && value === 'gender' && (!ctx.settings.erkekRoleId || !ctx.settings.kizRoleId)) {
        warn = '\n⚠️ Cinsiyet rolleri modu seçildi ama erkek/kız rolleri eksik. **Roller** bölümünden ayarla.';
      }
      if (slot.key === 'registerMode' && value === 'single' && !ctx.settings.singleRegisterRoleId) {
        warn = '\n⚠️ Tek rol modu seçildi ama Tek Kayıt Rolü ayarlanmamış. **Roller** bölümünden ayarla.';
      }
      ctx.note = `**${slot.label}** olarak **${label}** ayarlandı.${warn}`;
    }
    await i.update(await renderView(ctx));
    return;
  }

  if (id === 'sp_role' || id === 'sp_channel') {
    const slot = findSlot(ctx.state.page, slotKey);
    if (slot) {
      const doc = sourceDoc(ctx, slot);
      writePath(doc, slot.key, i.values[0]);

      let extra = '';
      if (slot.key === 'spotifyMatchChannelId' && !ctx.settings.spotifyMatchEnabled) {
        ctx.settings.spotifyMatchEnabled = true;
        extra = ' Spotify eşleşme sistemi otomatik olarak **açıldı**.';
      }

      await doc.save();
      ctx.note = `**${slot.label}** güncellendi.${extra}`;
    }
    await i.update(await renderView(ctx));
    return;
  }

  if (id === 'sp_text') {
    const slot = findSlot(ctx.state.page, slotKey);
    if (!slot) return;
    const doc = sourceDoc(ctx, slot);
    const current = readPath(doc, slot.key);

    const modalId = `sp_text_modal:${slot.key}`;
    const inputId = `sp_text_input:${slot.key}`;

    const input = new TextInputBuilder()
      .setCustomId(inputId)
      .setLabel(slot.label)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);
    if (current != null && current !== '') input.setValue(String(current).slice(0, 100));

    const modal = new ModalBuilder()
      .setCustomId(modalId)
      .setTitle(`${slot.label} Ayarla`)
      .addComponents(new ActionRowBuilder().addComponents(input));

    await i.showModal(modal);
    const submitted = await i.awaitModalSubmit({
      time: 120000,
      filter: m => m.customId === modalId && m.user.id === ctx.message.author.id
    }).catch(() => null);
    if (!submitted) return;

    const value = submitted.fields.getTextInputValue(inputId).trim();
    writePath(doc, slot.key, value);
    await doc.save();
    await submitted.deferUpdate().catch(() => {});
    ctx.note = `**${slot.label}** olarak **${value}** ayarlandı.`;
    await refresh(ctx);
    return;
  }


  if (id === 'sp_auth_menu') {
    ctx.state.page = 'main';
    ctx.state.slot = null;
    await i.update(await renderView(ctx));
    return;
  }

  if (id === 'sp_auth_tgl_owners' || id === 'sp_auth_tgl_role' || id === 'sp_auth_tgl_authority') {
    const gp = ctx.guildPermission;
    if (id === 'sp_auth_tgl_owners') {
      gp.isOwners = !gp.isOwners;
      ctx.note = `${gp.isOwners ? '✅' : '❌'} Güvenli Kişiler Sistemi ${gp.isOwners ? 'açıldı' : 'kapatıldı'}.`;
    } else if (id === 'sp_auth_tgl_role') {
      gp.isRole = !gp.isRole;
      ctx.note = `${gp.isRole ? '✅' : '❌'} Güvenli Roller Sistemi ${gp.isRole ? 'açıldı' : 'kapatıldı'}.`;
    } else {
      gp.isAuthority = !gp.isAuthority;
      ctx.note = `${gp.isAuthority ? '✅' : '❌'} Komut Yetki Sistemi ${gp.isAuthority ? 'açıldı' : 'kapatıldı'}.`;
    }
    await gp.save();
    await i.update(await renderView(ctx));
    return;
  }

  if (id === 'sp_auth_saferoles' || id === 'sp_auth_safeusers') {
    const gp = ctx.guildPermission;
    const isRole = id === 'sp_auth_saferoles';
    const set = new Set(isRole ? gp.roles : gp.owners);

    let added = 0;
    let removed = 0;
    for (const value of i.values) {
      if (set.has(value)) { set.delete(value); removed++; }
      else { set.add(value); added++; }
    }
    const finalList = [...set];
    if (isRole) gp.roles = finalList;
    else gp.owners = finalList;
    await gp.save();

    const parts = [];
    if (added) parts.push(`${added} eklendi`);
    if (removed) parts.push(`${removed} çıkarıldı`);
    ctx.note = `${isRole ? 'Güvenli roller' : 'Güvenli kullanıcılar'} · ${parts.join(', ') || 'Değişiklik yok'} · Toplam **${finalList.length}**`;
    await i.update(await renderView(ctx));
    return;
  }
}

export async function openSettingsPanel(client, message, manager) {
  const guildId = message.guild.id;

  let settings = await Settings.findOne({ guildId });
  if (!settings) {
    settings = new Settings({ guildId });
    await settings.save();
  }

  let modlog = await ModLogConfig.findOne({ guildId });
  if (!modlog) {
    modlog = new ModLogConfig({ guildId });
    await modlog.save();
  }

  let guildPermission = await GuildPermission.findOne({ guildId });
  if (!guildPermission) {
    guildPermission = new GuildPermission({ guildId });
    await guildPermission.save();
  }

  const ctx = {
    client,
    message,
    manager,
    settings,
    modlog,
    guildPermission,
    state: { page: 'main', slot: null },
    panel: null,
    collector: null,
    note: null
  };

  const initial = await renderView(ctx);
  const panel = await message.reply({ embeds: initial.embeds, components: initial.components });
  ctx.panel = panel;

  const collector = panel.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: PANEL_TIMEOUT
  });
  ctx.collector = collector;

  collector.on('collect', async i => {
    try {
      if (!(await stillAuthorized(ctx))) {
        return i.reply({ content: '❌ Bu paneli kullanma yetkiniz yok.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }
      await handleInteraction(ctx, i);
    } catch (error) {
      console.error('[settings] etkileşim hatası:', error);
      if (!i.replied && !i.deferred) {
        i.reply({ content: '❌ Bir hata oluştu.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  });

  collector.on('end', () => {
    panel.edit({ components: [] }).catch(() => {});
  });
}
