import { ComponentType, PermissionFlagsBits } from 'discord.js';
import { ActionGroup, ActionEntry } from "#models";
import Manager from '#managers';
import { Button } from '#helpers';
import { actionRolesHelper } from '#helpers';

const { parseEmoji,
  emojiDisplay,
  parseButtonStyle,
  buttonStyleToEnum,
  buttonStyleLabel,
  roleIdFromMention,
  buttonLabelDisplayForEmbed,
  buttonLabelRenderForDiscord } = actionRolesHelper;

const MAX_GROUPS_PER_GUILD = 25;
const MAX_EMOJIS_PER_GROUP = 20;
const MAX_BUTTONS_PER_GROUP = 25;

const EXIT_WORDS = ['bitti', 'bitir', 'exit', 'kapat', 'tamam', 'ok', 'quit', 'done'];

const STYLE_NAME_SHORT = {
  'primary': 'Mavi',
  'secondary': 'Gri',
  'success': 'Yeşil',
  'danger': 'Kırmızı',
  'warning': 'Sarı'
};

const ROLE_MODE_LABEL = {
  'single': '🎯 Tek Rol (Radio) — Sadece 1 rol alabilirsin, diğerleri silinir',
  'multi': ' Çoklu Rol (Checkbox) — Tüm rolleri istediğin gibi alabilirsin'
};

function groupTypeLabel(type) {
  if (type === 'emoji') return '🎯 Emoji Rolleri Grubu';
  if (type === 'button') return '🔘 Buton Rolleri Grubu';
  return '❓ Henüz Tip Seçilmemiş';
}

async function getGroup(guildId, groupId) {
  return await ActionGroup.findOne({ guildId, groupId }).lean();
}

async function getEntries(guildId, groupId) {
  return await ActionEntry.find({ guildId, groupId }).sort({ entryId: 1 }).lean();
}

async function getNextEntryId(guildId, groupId) {
  const max = await ActionEntry.findOne({ guildId, groupId }).sort({ entryId: -1 }).select('entryId').lean();
  return (max?.entryId || 0) + 1;
}

function roleInEntries(entries, roleId) {
  return entries.some(e => e.roleId === roleId);
}

function pickRoleIdFromArgs(args, message) {
  if (message && message.mentions && message.mentions.roles && message.mentions.roles.size > 0) {
    const first = message.mentions.roles.first();
    if (first) return first.id;
  }
  for (let i = 2; i < args.length; i++) {
    const piece = args[i];
    if (!piece) continue;
    const idMatch = piece.match(/^<@&(\d+)>$/);
    if (idMatch) return idMatch[1];
    if (/^\d{15,22}$/.test(piece)) return piece;
  }
  return null;
}

function pickEmojiFromArgs(args, excludeRoleId) {
  for (let i = 2; i < args.length; i++) {
    const piece = args[i];
    if (!piece) continue;
    if (/^<@&\d+>$/.test(piece)) continue;
    if (excludeRoleId && piece === String(excludeRoleId)) continue;
    if (parseEmoji(piece)) return piece;
  }
  const joined = args.slice(2).join(' ');
  const inline = joined.match(/<(a)?:[a-zA-Z0-9_]+:\d+>/);
  if (inline) return inline[0];
  for (let i = 2; i < args.length; i++) {
    const piece = args[i];
    if (!piece) continue;
    if (/^<@&\d+>$/.test(piece)) continue;
    if (excludeRoleId && piece === String(excludeRoleId)) continue;
    if (parseEmoji(piece)) return piece;
  }
  return null;
}

function pickButtonStyleAndLabel(args, excludeRoleId, fallbackRoleName) {
  let style = 'secondary';
  let styleFoundIdx = -1;
  const styleKeywords = [
    'primary', 'mavi', 'blue', 'blurple',
    'secondary', 'gri', 'gray', 'grey',
    'success', 'yesil', 'yesıl', 'green',
    'danger', 'kirmizi', 'kırmızı', 'red',
    'warning', 'warn', 'sari', 'sarı', 'yellow'
  ];

  for (let i = 2; i < args.length; i++) {
    const piece = String(args[i] || '').toLowerCase();
    if (styleKeywords.includes(piece)) {
      style = parseButtonStyle(piece);
      styleFoundIdx = i;
      break;
    }
  }

  let labelParts = [];
  for (let i = 2; i < args.length; i++) {
    const piece = args[i];
    if (!piece) continue;
    if (/^<@&\d+>$/.test(piece)) continue;
    if (String(excludeRoleId) === piece) continue;
    if (styleFoundIdx === i) continue;
    labelParts.push(piece);
  }

  let label = labelParts.join(' ').trim();
  if (!label) label = String(fallbackRoleName || 'Rol');

  return { style, label };
}

async function renderGroupEmbed(manager, group, entries, message, extra = '') {
  const sender = manager.sender;
  const type = group.type || null;
  const guild = message?.guild || manager?.action?.guild || null;

  let body = `**📦 Grup Adı:** ${group.groupName}\n`;
  body += `**🆔 Grup ID:** \`${group.groupId}\`\n`;
  body += `**🔖 Tip:** ${groupTypeLabel(type)}\n`;
  body += `**🎚️ Rol Modu:** ${ROLE_MODE_LABEL[group.roleMode || 'multi'] || group.roleMode}\n`;
  body += `**🎚️ Durum:** ${group.setupMessageId ? ' Kurulmuş' : '❌ Kurulmamış'}\n`;
  if (group.description) body += `\n**📝 Açıklama:** ${group.description}\n`;
  body += `\n**Toplam Kayıt:** ${entries.length}\n`;

  if (group.setupText) {
    body += `\n**📝 Setup Metni (Açıklama):**\n> ${String(group.setupText).slice(0, 200).replace(/\n/g, '\n> ')}\n`;
  }

  if (entries.length === 0) {
    body += `\n*Henüz hiç ${type === 'emoji' ? 'emoji' : type === 'button' ? 'buton' : 'öğe'} eklenmemiş.*\n`;
  } else {
    if (type === 'emoji') {
      body += `\n── 🎯 EMOJİLER ──\n`;
      for (const e of entries) {
        const parsed = parseEmoji(e.emojiRaw || `<${e.emojiAnimated ? 'a' : ''}:${e.emojiName || '_'}:${e.emojiId}>`);
        body += `[\`${String(e.entryId).padStart(2, '0')}\`] ${emojiDisplay(parsed)}  →  <@&${e.roleId}>\n`;
      }
    } else if (type === 'button') {
      body += `\n── 🔘 BUTONLAR ──\n`;
      for (const e of entries) {
        let roleNameFallback = 'Rol';
        if (guild) {
          const role = await guild.roles.fetch(e.roleId).catch(() => null);
          if (role) roleNameFallback = role.name;
        }
        const displayLbl = buttonLabelDisplayForEmbed(e.buttonLabel, roleNameFallback);
        body += `[\`${String(e.entryId).padStart(2, '0')}\`] [${displayLbl}] (${STYLE_NAME_SHORT[e.buttonStyle] || e.buttonStyle})  →  <@&${e.roleId}>\n`;
      }
    } else {
      for (const e of entries) {
        body += `[\`${e.entryId}\`] type=${e.type} role=<@&${e.roleId}>\n`;
      }
    }
  }

  if (extra) body += `\n${extra}\n`;

  const color = type === 'emoji' ? 'Blurple' : type === 'button' ? 'Green' : 'Yellow';

  return sender.embed({
    title: `⚙️ Actions Editör - ${group.groupName}`,
    description: body,
    color
  });
}

function buildEditorButtons(group) {
  const btn = new Button();
  const type = group.type;

  if (!type) {
    btn.add("act_tip_emoji", "🎯 Emoji Grubu Yap", btn.style.Primary);
    btn.add("act_tip_button", "🔘 Buton Grubu Yap", btn.style.Primary);
  } else if (type === 'emoji') {
    btn.add("act_add_emoji", "➕ Emoji Ekle", btn.style.Success);
  } else if (type === 'button') {
    btn.add("act_add_button", "➕ Buton Ekle", btn.style.Success);
  }

  btn.add("act_remove_entry", "➖ ID ile Çıkar", btn.style.Secondary);
  btn.add("act_done", " Bitir / Kaydet", btn.style.Danger);

  return [btn.build()];
}

async function checkRoleHierarchy(member, role) {
  if (!member || !role) return { ok: true };
  if (!member.guild) return { ok: true };
  const botMember = member.guild.members.cache.get(member.client.user.id) || await member.guild.members.fetchMe().catch(() => null);
  if (!botMember) return { ok: true };
  if (role.position >= botMember.roles.highest.position) {
    return { ok: false, reason: `<@&${role.id}> rolü benim rolümden üstte, bu rolü veremem.` };
  }
  return { ok: true };
}

export default {
  name: 'actions',
  aliases: ['action', 'actionrole', 'actionroles', 'rolmenu'],
  description: "Emoji veya buton ile otomatik rol verme grupları oluştur/yönet.",
  usage: ".actions list | .actions create <grupAdi> | .actions show <grupId> | .actions add <grupId> <@rol> <emoji|stil> [yazi] | .actions remove <grupId> <entryId> | .actions delete <grupId> | .actions setup <grupId> <text>",
  category: 'setup',

  permissions: {
    authorities: [PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const sender = manager.sender;
    const guildId = message.guild.id;

    const sub = (args[0] || 'list').toLowerCase();

    if (['list', 'liste', ''].includes(sub)) {
      const groups = await ActionGroup.find({ guildId }).sort({ createdAt: -1 }).lean();
      if (groups.length === 0) {
        return sender.reply(sender.embed({
          title: "⚙️ Actions Grupları",
          description: "Sunucuda henüz hiç action grubu yok.\n\n**Nasıl oluşturulur:**\n`.actions create <grupAdi>`",
          color: "Yellow"
        }));
      }

      let text = `Toplam **${groups.length}** grup var:\n\n`;
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const cnt = await ActionEntry.countDocuments({ guildId, groupId: g.groupId });
        const emojiCount = g.type === 'emoji' ? cnt : 0;
        const btnCount = g.type === 'button' ? cnt : 0;
        const kur = g.setupMessageId ? ' Kurulmuş' : '❌ Kurulmamış';
        text += `\`${String(i + 1).padStart(2, '0')}\` **${g.groupName}** (\`${g.groupId}\`)\n`;
        text += `      → Tip: ${groupTypeLabel(g.type)} | Kayıt: ${cnt}${g.type === 'emoji' ? ` (emoji)` : g.type === 'button' ? ` (buton)` : ''} | ${kur}\n`;
      }

      return sender.reply(sender.embed({
        title: "📋 Tüm Action Grupları",
        description: text,
        color: "Blurple"
      }));
    }

    if (['create', 'olustur', 'oluştur', 'yeni', 'new'].includes(sub)) {
      const groupNameRaw = args.slice(1).join(' ').trim();
      if (!groupNameRaw) {
        return sender.reply(sender.errorEmbed("❌ Kullanım: `.actions create <grupAdi>`"));
      }

      const groupCount = await ActionGroup.countDocuments({ guildId });
      if (groupCount >= MAX_GROUPS_PER_GUILD) {
        return sender.reply(sender.errorEmbed(`❌ Sunucu başına maksimum ${MAX_GROUPS_PER_GUILD} grup olabilir.`));
      }

      const groupId = groupNameRaw
        .toLowerCase()
        .replace(/[^a-z0-9çğıöşü_]/gi, '_')
        .replace(/_{2,}/g, '_')
        .slice(0, 32);

      const exists = await ActionGroup.findOne({ guildId, groupId });
      if (exists) {
        return sender.reply(sender.errorEmbed(`❌ \`${groupId}\` ID'li bir grup zaten var. Farklı bir ad dene.`));
      }

      const group = await ActionGroup.create({
        guildId,
        groupId,
        groupName: groupNameRaw.slice(0, 80)
      });

      const entries = await getEntries(guildId, groupId);
      const embed = await renderGroupEmbed(manager, group.toObject(), entries, message,
        `\n💡 İlk olarak **grubun tipini seçin** (Emoji mi Buton mu? İkisini karıştıramazsınız!):\n`);
      const rows = buildEditorButtons(group.toObject());

      const editorMsg = await message.channel.send({ embeds: [embed], components: rows });
      return await startEditorSession(client, message, editorMsg, group.toObject(), manager);
    }

    if (['show', 'goster', 'göster', 'detay', 'detail'].includes(sub)) {
      const groupId = (args[1] || '').toLowerCase();
      if (!groupId) return sender.reply(sender.errorEmbed("❌ Kullanım: `.actions show <grupId>`"));

      const group = await getGroup(guildId, groupId);
      if (!group) return sender.reply(sender.errorEmbed(`❌ \`${groupId}\` ID'li grup bulunamadı.`));
      const entries = await getEntries(guildId, groupId);

      const embed = await renderGroupEmbed(manager, group, entries, message);
      const rows = buildEditorButtons(group);
      const editorMsg = await message.channel.send({ embeds: [embed], components: rows });

      return await startEditorSession(client, message, editorMsg, group, manager);
    }

    if (['add', 'ekle'].includes(sub)) {
      const groupId = (args[1] || '').toLowerCase();
      if (!groupId) return sender.reply(sender.errorEmbed("❌ Kullanım: `.actions add <grupId> <@rol> <emoji|stili> [butonYazisi]`"));

      const group = await getGroup(guildId, groupId);
      if (!group) return sender.reply(sender.errorEmbed(`❌ \`${groupId}\` ID'li grup bulunamadı.`));

      if (!group.type) {
        return sender.reply(sender.errorEmbed(
          "❌ Önce grubun tipini seçmelisin. `.actions show " + groupId + "` yap ve alttaki butonlarla tip seç."
        ));
      }

      const rest = args.slice(2).join(' ').trim();
      const roleId = pickRoleIdFromArgs(args, message);
      if (!roleId) return sender.reply(sender.errorEmbed("❌ Rol bulunamadı. Komutta bir yerde `@RolEtiketi` veya `1234567890` (rol ID) yaz."));

      const role = await message.guild.roles.fetch(roleId).catch(() => null);
      if (!role) return sender.reply(sender.errorEmbed("❌ Rol bulunamadı (ID yanlış veya silinmiş)."));

      const hr = await checkRoleHierarchy(message.member, role);
      if (!hr.ok) return sender.reply(sender.errorEmbed(hr.reason));

      const entries = await getEntries(guildId, groupId);
      if (roleInEntries(entries, roleId)) {
        return sender.reply(sender.errorEmbed(`❌ <@&${roleId}> rolü bu gruba zaten eklenmiş.`));
      }

      const limit = group.type === 'emoji' ? MAX_EMOJIS_PER_GROUP : MAX_BUTTONS_PER_GROUP;
      if (entries.length >= limit) {
        return sender.reply(sender.errorEmbed(`❌ Maksimum ${limit} kayıt sınırına ulaşıldı.`));
      }

      if (group.type === 'emoji') {
        const emojiStr = pickEmojiFromArgs(args, roleId);
        if (!emojiStr) return sender.reply(sender.errorEmbed("❌ Emoji bulunamadı. Komuta bir yerde `<a:kalp:123>` şeklinde veya unicode ✨ şeklinde emoji yaz."));
        const parsed = parseEmoji(emojiStr);
        if (!parsed) return sender.reply(sender.errorEmbed("❌ Geçerli bir emoji değil. Örn: `<a:kalp:123>` veya ✨"));

        const sameEmoji = entries.some(e => {
          if (e.type !== 'emoji') return false;
          if (parsed.isCustom && e.emojiId && e.emojiId === parsed.id) return true;
          if (!parsed.isCustom && e.emojiName === parsed.name) return true;
          return false;
        });
        if (sameEmoji) return sender.reply(sender.errorEmbed("❌ Bu emoji zaten grupta var."));

        const entryId = await getNextEntryId(guildId, groupId);
        await ActionEntry.create({
          guildId,
          groupId,
          entryId,
          type: 'emoji',
          roleId,
          emojiId: parsed.id,
          emojiName: parsed.name,
          emojiAnimated: parsed.animated,
          emojiRaw: parsed.raw
        });
        return sender.reply(sender.embed({
          title: " Eklendi",
          description: `${emojiDisplay(parsed)}  →  <@&${roleId}>\n(entryId: \`${entryId}\`)`,
          color: "Green"
        }));
      }

      if (group.type === 'button') {
        const { style, label } = pickButtonStyleAndLabel(args, roleId, role.name);
        const entryId = await getNextEntryId(guildId, groupId);
        await ActionEntry.create({
          guildId,
          groupId,
          entryId,
          type: 'button',
          roleId,
          buttonStyle: style,
          buttonLabel: label
        });

        const displayLbl = buttonLabelDisplayForEmbed(label, role.name);
        return sender.reply(sender.embed({
          title: " Eklendi",
          description: `[${displayLbl}] (${buttonStyleLabel(style)})  →  <@&${roleId}>\n(entryId: \`${entryId}\`)`,
          color: "Green"
        }));
      }
    }

    if (['remove', 'cikar', 'çıkar', 'sil', 'deleteentry'].includes(sub)) {
      const groupId = (args[1] || '').toLowerCase();
      const entryIdRaw = args[2];
      if (!groupId || !entryIdRaw) return sender.reply(sender.errorEmbed("❌ Kullanım: `.actions remove <grupId> <entryId>`"));
      const entryId = parseInt(entryIdRaw, 10);
      if (isNaN(entryId)) return sender.reply(sender.errorEmbed("❌ entryId sayı olmalı."));

      const group = await getGroup(guildId, groupId);
      if (!group) return sender.reply(sender.errorEmbed(`❌ \`${groupId}\` ID'li grup bulunamadı.`));

      const del = await ActionEntry.findOneAndDelete({ guildId, groupId, entryId });
      if (!del) return sender.reply(sender.errorEmbed(`❌ \`${entryId}\` entryId bulunamadı.`));
      return sender.reply(sender.embed({
        title: " Çıkarıldı",
        description: `entryId \`${entryId}\` silindi. Tip: \`${del.type}\` Rol: <@&${del.roleId}>`,
        color: "Red"
      }));
    }

    if (['delete', 'destroy', 'grubsil', 'grup-sil'].includes(sub)) {
      const groupId = (args[1] || '').toLowerCase();
      if (!groupId) return sender.reply(sender.errorEmbed("❌ Kullanım: `.actions delete <grupId>`"));

      const group = await getGroup(guildId, groupId);
      if (!group) return sender.reply(sender.errorEmbed(`❌ \`${groupId}\` ID'li grup bulunamadı.`));

      if (group.setupMessageId && group.setupChannelId) {
        try {
          const ch = await message.guild.channels.fetch(group.setupChannelId).catch(() => null);
          if (ch && ch.messages) {
            const m = await ch.messages.fetch(group.setupMessageId).catch(() => null);
            if (m) await m.delete().catch(() => {});
          }
        } catch {}
      }

      await ActionEntry.deleteMany({ guildId, groupId });
      await ActionGroup.deleteOne({ _id: group._id });

      return sender.reply(sender.embed({
        title: "🗑️ Grup Silindi",
        description: `**${group.groupName}** (\`${group.groupId}\`) tamamen silindi.`,
        color: "Red"
      }));
    }

    if (['setup', 'kur', 'yayin', 'yayınla', 'deploy'].includes(sub)) {
      const groupId = (args[1] || '').toLowerCase();
      if (!groupId) return sender.reply(sender.errorEmbed("❌ Kullanım: `.actions setup <grupId> <text>`\n\n**Örnek:**\n`.actions setup myroles Aşağıdaki emojilere tıklayarak rollerini alabilirsin!`"));

      const group = await getGroup(guildId, groupId);
      if (!group) return sender.reply(sender.errorEmbed(`❌ \`${groupId}\` ID'li grup bulunamadı.`));
      if (!group.type) return sender.reply(sender.errorEmbed("❌ Grubun tipi henüz seçilmemiş."));

      const entries = await getEntries(guildId, groupId);
      if (entries.length === 0) return sender.reply(sender.errorEmbed("❌ Grubun içinde hiç kayıt yok. Önce emoji/buton ekle."));

      const targetChannel = message.channel;

      let setupText = args.slice(2).join(' ').trim();

      if (!setupText) {
        return sender.reply(sender.errorEmbed(
          "❌ Setup text (açıklama) belirtmelisin!\n\n" +
          "**Kullanım:**\n`.actions setup <grupId> <text>`\n\n" +
          "**Örnek:**\n`.actions setup myroles Aşağıdaki emojilere tıklayarak rollerini alabilirsin!`"
        ));
      }

      const state = {
        setupText: setupText,
        roleMode: group.roleMode || 'multi'
      };

      {
        const roleBtn = new Button();
        roleBtn.add(`act_setup_radio_${groupId}`, "🎯 TEK ROL (Radio) — Sadece 1 rol",
          (state.roleMode === 'single' ? roleBtn.style.Success : roleBtn.style.Secondary));
        roleBtn.add(`act_setup_check_${groupId}`, " ÇOKLU ROL (Checkbox) — Tümünü alabilirsin",
          (state.roleMode === 'multi' ? roleBtn.style.Success : roleBtn.style.Secondary));
        roleBtn.add(`act_setup_next_${groupId}`, "▶️ Devam Et", roleBtn.style.Primary);
        roleBtn.add(`act_setup_cancel_${groupId}`, "❌ İptal", roleBtn.style.Danger);

        const roleMsg = await message.channel.send({
          embeds: [sender.embed({
            title: "⚙️ Setup Adım — Rol Alma Modu",
            description:
              "Kullanıcılar bu gruptan **kaç tane rol alabilir?**\n\n" +
              `Şu anki seçim: **${state.roleMode.toUpperCase()}**\n\n` +
              "• **🎯 Tek Rol (Radio):** Kullanıcı sadece 1 tane rol alabilir.\n" +
              "  Başka bir rol almak istediğinde, eskisi OTOMATİK silinir.\n" +
              "  Örn: Renk rolleri, takım rolleri (sadece 1 renk / 1 takım).\n\n" +
              "• ** Çoklu Rol (Checkbox):** Kullanıcı istediği kadar rol alabilir.\n" +
              "  Hiçbir şey otomatik silinmez.\n" +
              "  Örn: Oyun rolleri, ilgi alanı rolleri (hepsini aynı anda alabilirsin).\n\n" +
              "Alttan butonlarla seçim yap, sonra **▶️ Devam Et** tuşuna bas.",
            color: "Yellow"
          })],
          components: [roleBtn.build()]
        });

        const roleCollector = roleMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 10 * 60_000 });

        roleCollector.on('collect', async (i) => {
          if (i.user.id !== message.author.id) return i.reply({ content: "❌ Bu buton sana ait değil.", ephemeral: true }).catch(() => {});

          const cid = i.customId;

          if (cid.startsWith('act_setup_cancel_')) {
            try { roleCollector.stop('cancel'); } catch {}
            try {
              await i.update({ embeds: [sender.embed({ title: "❌ İptal edildi", color: "Red" })], components: [] }).catch(() => {});
            } catch {}
            return;
          }

          if (cid.startsWith('act_setup_radio_')) {
            state.roleMode = 'single';
          } else if (cid.startsWith('act_setup_check_')) {
            state.roleMode = 'multi';
          } else if (cid.startsWith('act_setup_next_')) {
            try { roleCollector.stop('next'); } catch {}
            return;
          }

          const b1 = new Button();
          b1.add(`act_setup_radio_${groupId}`, "🎯 TEK ROL (Radio) — Sadece 1 rol",
            state.roleMode === 'single' ? b1.style.Success : b1.style.Secondary);
          b1.add(`act_setup_check_${groupId}`, " ÇOKLU ROL (Checkbox) — Tümünü alabilirsin",
            state.roleMode === 'multi' ? b1.style.Success : b1.style.Secondary);
          b1.add(`act_setup_next_${groupId}`, "▶️ Devam Et", b1.style.Primary);
          b1.add(`act_setup_cancel_${groupId}`, "❌ İptal", b1.style.Danger);

          await i.update({
            embeds: [sender.embed({
              title: "⚙️ Setup Adım — Rol Alma Modu",
              description:
                "Kullanıcılar bu gruptan **kaç tane rol alabilir?**\n\n" +
                `Şu anki seçim: **${state.roleMode.toUpperCase()}**\n\n` +
                "• **🎯 Tek Rol (Radio):** Kullanıcı sadece 1 tane rol alabilir.\n" +
                "  Başka bir rol almak istediğinde, eskisi OTOMATİK silinir.\n" +
                "  Örn: Renk rolleri, takım rolleri (sadece 1 renk / 1 takım).\n\n" +
                "• ** Çoklu Rol (Checkbox):** Kullanıcı istediği kadar rol alabilir.\n" +
                "  Hiçbir şey otomatik silinmez.\n" +
                "  Örn: Oyun rolleri, ilgi alanı rolleri (hepsini aynı anda alabilirsin).\n\n" +
                "Alttan butonlarla seçim yap, sonra **▶️ Devam Et** tuşuna bas.",
              color: "Yellow"
            })],
            components: [b1.build()]
          }).catch(() => {});
        });

        let stoppedReason = await new Promise((resolve) => {
          roleCollector.on('end', (__, reason) => resolve(reason));
        });

        try { await roleMsg.delete().catch(() => {}); } catch {}

        if (stoppedReason === 'cancel' || stoppedReason === 'time') {
          return sender.reply(sender.embed({
            title: stoppedReason === 'time' ? "⏰ Süre doldu" : "❌ İptal edildi",
            color: "Red"
          }));
        }
      }

      {
        const botBtn = new Button();
        botBtn.add(`act_setup_onay_${groupId}`, " Kurulumu Onayla & Yayınla", botBtn.style.Success);
        botBtn.add(`act_setup_cancel2_${groupId}`, "❌ İptal", botBtn.style.Danger);

        const onayEmbed = sender.embed({
          title: "⚠️ Setup Son Adım — Onay",
          description:
            `**Grup:** ${group.groupName} (\`${group.groupId}\`)\n` +
            `**Kanal:** ${targetChannel}\n` +
            `**Tip:** ${groupTypeLabel(group.type)}\n` +
            `**🎚️ Rol Modu:** ${ROLE_MODE_LABEL[state.roleMode] || state.roleMode}\n` +
            `**Kayıt Sayısı:** ${entries.length}\n\n` +
            `**📝 Mesaj Metni:**\n> ${String(state.setupText).slice(0, 600).replace(/\n/g, '\n> ')}\n\n` +
            `Devam edilsin mi?`,
          color: "Yellow"
        });
        const onayMsg = await message.channel.send({ embeds: [onayEmbed], components: [botBtn.build()] });

        const coll = onayMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });
        coll.on('collect', async (i) => {
          if (i.user.id !== message.author.id) return i.reply({ content: "❌ Bu buton sana ait değil.", ephemeral: true }).catch(() => {});

          if (i.customId.startsWith('act_setup_cancel2_') || i.customId.startsWith('act_setup_cancel_')) {
            try {
              await i.update({ embeds: [sender.embed({ title: "❌ İptal edildi", description: "Setup iptal edildi.", color: "Red" })], components: [] }).catch(() => {});
            } catch {}
            coll.stop('cancel');
            return;
          }

          if (i.customId.startsWith('act_setup_onay_')) {
            try {
              const groupToDeploy = { ...group, setupText: state.setupText, roleMode: state.roleMode };
              const { sentMsg, ok, err } = await deployGroup(client, message.guild, targetChannel, groupToDeploy, entries, sender);
              if (!ok) {
                try {
                  await i.update({ embeds: [sender.errorEmbed("❌ Hata: " + (err || 'bilinmiyor'))], components: [] }).catch(() => {});
                } catch {}
                coll.stop('err');
                return;
              }

              await ActionGroup.updateOne({ _id: group._id }, {
                $set: {
                  setupMessageId: sentMsg.id,
                  setupChannelId: targetChannel.id,
                  setupText: state.setupText,
                  roleMode: state.roleMode
                }
              });

              try {
                await i.update({
                  embeds: [sender.embed({
                    title: " Kurulum Tamamlandı",
                    description:
                      `Mesaj ID: \`${sentMsg.id}\`\n` +
                      `Kanal: ${targetChannel}\n` +
                      `Rol Modu: ${state.roleMode.toUpperCase()}\n` +
                      `[Mesaja Git](${sentMsg.url})`,
                    color: "Green"
                  })],
                  components: []
                }).catch(() => {});
              } catch {}
              coll.stop('ok');
            } catch (e) {
              console.error(e);
              try {
                await i.update({ embeds: [sender.errorEmbed("❌ Hata: " + e.message)], components: [] }).catch(() => {});
              } catch {}
              coll.stop('err');
            }
          }
        });
        coll.on('end', () => {});
      }
      return;
    }

    return sender.reply(sender.errorEmbed(
      "❌ Geçersiz komut. Kullanımlar:\n\n" +
      "`.actions list`\n" +
      "`.actions create <grupAdi>`\n" +
      "`.actions show <grupId>`\n" +
      "`.actions add <grupId> <@rol> <emoji|stil> [butonYazisi]`\n" +
      "`.actions remove <grupId> <entryId>`\n" +
      "`.actions delete <grupId>`\n" +
      "`.actions setup <grupId> <text>`\n\n" +
      "**Setup Örneği:**\n" +
      "`.actions setup myroles Aşağıdaki emojilere tıklayarak rollerini alabilirsin!`"
    ));
  }
};

async function deployGroup(client, guild, channel, group, entries, sender) {
  try {
    if (group.type === 'emoji') {
      const text = group.setupText || `**${group.groupName}**\n\nAşağıdaki emojilere tıklayarak ilgili rolleri alabilirsiniz.`;
      const sentMsg = await channel.send({
        embeds: [sender.embed({
          title: `🎯 ${group.groupName}`,
          description: text,
          color: 'Blurple'
        })]
      });

      for (const e of entries) {
        if (!e.emojiId && !e.emojiName) continue;
        let reactionTarget;
        if (e.emojiId) {
          reactionTarget = { id: e.emojiId, animated: !!e.emojiAnimated, name: e.emojiName || null };
        } else {
          reactionTarget = e.emojiName;
        }
        try {
          await sentMsg.react(reactionTarget).catch(() => {});
        } catch (err) {}
      }

      return { ok: true, sentMsg };
    }

    if (group.type === 'button') {
      const text = group.setupText || `**${group.groupName}**\n\nAşağıdaki butonlara tıklayarak ilgili rolleri alabilirsiniz.`;

      const rows = [];
      let currentRow = null;
      let count = 0;
      const rawRows = [];
      for (const e of entries) {
        if (count % 5 === 0) {
          if (currentRow) rawRows.push(currentRow);
          currentRow = [];
        }

        const labelInfo = buttonLabelRenderForDiscord(e.buttonLabel, null);
        const styleEnum = buttonStyleToEnum(e.buttonStyle);

        currentRow.push({
          customId: `actions_${group.groupId}_btn_${e.entryId}`,
          label: labelInfo.text ? labelInfo.text.slice(0, 80) : (e.buttonLabel ? String(e.buttonLabel).slice(0, 80) : 'Rol'),
          style: styleEnum,
          hasCustomEmoji: labelInfo.hasCustomEmoji,
          customEmoji: labelInfo.hasCustomEmoji ? {
            id: labelInfo.customEmojiId,
            name: labelInfo.customEmojiName,
            animated: !!labelInfo.customEmojiAnimated
          } : null
        });

        count++;
        if (count >= 25) break;
      }
      if (currentRow) rawRows.push(currentRow);

      for (const rawRow of rawRows) {
        const rowObj = new Button();
        for (const b of rawRow) {
          if (b.hasCustomEmoji && b.customEmoji) {
            rowObj.add(b.customId, b.label || '', b.style, b.customEmoji);
          } else {
            rowObj.add(b.customId, b.label, b.style);
          }
        }
        rows.push(rowObj);
      }

      const builtRows = rows.map(r => r.build());

      const sentMsg = await channel.send({
        embeds: [sender.embed({
          title: `${message.guild.name}`,
          description: text,
          color: 'Green'
        })],
        components: builtRows
      });

      return { ok: true, sentMsg };
    }

    return { ok: false, err: "Geçersiz grup tipi." };
  } catch (e) {
    console.error(e);
    return { ok: false, err: e.message || String(e) };
  }
}

async function startEditorSession(client, triggerMessage, editorMsg, group, manager) {
  const sender = manager.sender;
  const guildId = triggerMessage.guild.id;
  const groupId = group.groupId;
  const authorId = triggerMessage.author.id;

  const activeRef = { closed: false };

  async function refreshEditor(extra = '') {
    if (activeRef.closed) return;
    const freshGroup = await getGroup(guildId, groupId);
    if (!freshGroup) {
      activeRef.closed = true;
      try {
        await editorMsg.edit({ embeds: [sender.embed({ title: "❌ Grup Silindi", description: "Bu grup silindi, editör kapatılıyor.", color: "Red" })], components: [] }).catch(() => {});
      } catch {}
      return;
    }
    const entries = await getEntries(guildId, groupId);
    const embed = await renderGroupEmbed(manager, freshGroup, entries, triggerMessage, extra);
    const rows = buildEditorButtons(freshGroup);
    try {
      await editorMsg.edit({ embeds: [embed], components: rows });
    } catch {}
  }

  const collector = editorMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30 * 60_000 });

  collector.on('collect', async (i) => {
    if (i.user.id !== authorId) {
      return i.reply({ content: "❌ Bu editörü sadece komutu yazan kullanabilir.", ephemeral: true });
    }

    const id = i.customId;

    if (id === 'act_done') {
      activeRef.closed = true;
      collector.stop('done');
      await i.update({ embeds: editorMsg.embeds, components: [] }).catch(() => {});
      return;
    }

    if (id === 'act_tip_emoji' || id === 'act_tip_button') {
      const chosen = id === 'act_tip_emoji' ? 'emoji' : 'button';
      const current = await ActionGroup.findOne({ guildId, groupId });
      if (!current) return;
      if (current.type && current.type !== chosen) {
        return i.reply({ content: `❌ Tip zaten \`${current.type}\` olarak seçilmiş, değiştirilemez.`, ephemeral: true });
      }
      current.type = chosen;
      await current.save();
      await i.deferUpdate().catch(() => {});
      await refreshEditor(`\nGrup tipi **${chosen === 'emoji' ? '🎯 Emoji' : '🔘 Buton'}** olarak kilitlendi.\n`);
      return;
    }

    if (id === 'act_add_emoji' || id === 'act_add_button') {
      const current = await getGroup(guildId, groupId);
      if (!current || !current.type) return i.reply({ content: "❌ Önce tip seçmelisin.", ephemeral: true });

      const expected = id === 'act_add_emoji' ? 'emoji' : 'button';
      if (current.type !== expected) return i.reply({ content: `❌ Bu grup \`${current.type}\` grubu, sadece ${current.type} ekleyebilirsin.`, ephemeral: true });

      const entries = await getEntries(guildId, groupId);
      const limit = current.type === 'emoji' ? MAX_EMOJIS_PER_GROUP : MAX_BUTTONS_PER_GROUP;
      if (entries.length >= limit) return i.reply({ content: `❌ Maksimum ${limit} kayıt.`, ephemeral: true });

      let prompt;
      if (current.type === 'emoji') {
        prompt = "Yeni emojiyi ve rolü şu formatta yaz:\n`@Rol <:emoji:12345>`\n\nveya\n`<a:animemoji:123> @Rol`\n\nÇıkmak için: **bitti**";
      } else {
        prompt =
          "Yeni butonu şu formatta yaz:\n`@Rol <stil> [butonYazisi_VEYA_Emoji]`\n\n" +
          "Stiller: `primary mavi`, `secondary gri`, `success yesil`, `danger kirmizi`, `warning sari`\n\n" +
          "Örnekler:\n" +
          "`@Üye secondary Üye Ol`\n" +
          "`@Minecraft primary <:mc:1234567>` (butona sadece emoji basar)\n" +
          "`@Yetkili danger 🔨 Başvur`\n\n" +
          "Çıkmak için: **bitti**";
      }

      await i.reply({ content: prompt, ephemeral: true }).catch(() => {});

      try {
        const collected = await triggerMessage.channel.awaitMessages({
          filter: (m) => m.author.id === authorId,
          max: 1,
          time: 120_000,
          errors: ['time']
        });
        const userMsg = collected.first();
        if (!userMsg) return;
        const content = userMsg.content.trim();
        try { await userMsg.delete().catch(() => {}); } catch {}

        if (EXIT_WORDS.includes(content.toLowerCase())) {
          return;
        }

        const parts = content.split(/\s+/).filter(Boolean);

        const rolePart = parts.find(p => /^<@&\d+>$/.test(p) || /^\d+$/.test(p));
        if (!rolePart) {
          await triggerMessage.channel.send({ content: "❌ Rol bulamadım. Tekrar dene." }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
          return;
        }
        const roleId = roleIdFromMention(rolePart);
        if (!roleId) {
          await triggerMessage.channel.send({ content: "❌ Geçersiz rol." }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
          return;
        }
        const role = await triggerMessage.guild.roles.fetch(roleId).catch(() => null);
        if (!role) {
          await triggerMessage.channel.send({ content: "❌ Rol bulunamadı." }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
          return;
        }

        const hr = await checkRoleHierarchy(triggerMessage.member, role);
        if (!hr.ok) {
          await triggerMessage.channel.send({ content: hr.reason }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
          return;
        }

        const freshEntries = await getEntries(guildId, groupId);
        if (roleInEntries(freshEntries, roleId)) {
          await triggerMessage.channel.send({ content: "❌ Bu rol zaten ekli." }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
          return;
        }

        const nextId = await getNextEntryId(guildId, groupId);

        if (current.type === 'emoji') {
          const emojiStr = parts.find(p => p !== rolePart && p.length > 0 && !/^\d+$/.test(p)) || content;
          const parsed = parseEmoji(emojiStr);
          if (!parsed) {
            await triggerMessage.channel.send({ content: "❌ Emoji çözülemedi. Format: `<a:ad:id>` veya unicode." }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            return;
          }
          const sameEmoji = freshEntries.some(e => {
            if (e.type !== 'emoji') return false;
            if (parsed.isCustom && e.emojiId && e.emojiId === parsed.id) return true;
            if (!parsed.isCustom && e.emojiName === parsed.name) return true;
            return false;
          });
          if (sameEmoji) {
            await triggerMessage.channel.send({ content: "❌ Bu emoji zaten var." }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            return;
          }
          await ActionEntry.create({
            guildId, groupId, entryId: nextId, type: 'emoji', roleId,
            emojiId: parsed.id, emojiName: parsed.name, emojiAnimated: parsed.animated, emojiRaw: parsed.raw
          });
        } else {
          const stylePart = parts.find(p => p !== rolePart);
          const style = parseButtonStyle(stylePart, 'secondary');
          const rolePartIndex = parts.indexOf(rolePart);
          const stylePartIndex = parts.findIndex(p => p === stylePart);
          let label = '';
          for (let i = 0; i < parts.length; i++) {
            if (i !== rolePartIndex && i !== stylePartIndex) {
              label += (label ? ' ' : '') + parts[i];
            }
          }
          if (!label) label = role.name || 'Rol';
          label = label.slice(0, 80);

          await ActionEntry.create({
            guildId, groupId, entryId: nextId, type: 'button', roleId,
            buttonStyle: style, buttonLabel: label
          });
        }

        await refreshEditor();
      } catch (e) {
        if (e && e.message && e.message.includes('time')) {
          await triggerMessage.channel.send({ content: "⏰ Süre doldu, ekleme iptal." }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        } else {
          console.error(e);
        }
      }
      return;
    }

    if (id === 'act_remove_entry') {
      await i.reply({ content: "Silmek istediğin **entryId** numarasını yaz:\n\nÖrn: `3`\n\nÇıkmak için: **bitti**", ephemeral: true }).catch(() => {});
      try {
        const collected = await triggerMessage.channel.awaitMessages({
          filter: m => m.author.id === authorId,
          max: 1,
          time: 60_000,
          errors: ['time']
        });
        const userMsg = collected.first();
        if (!userMsg) return;
        const content = userMsg.content.trim();
        try { await userMsg.delete().catch(() => {}); } catch {}
        if (EXIT_WORDS.includes(content.toLowerCase())) return;

        const n = parseInt(content, 10);
        if (isNaN(n)) {
          await triggerMessage.channel.send({ content: "❌ Sayı olmalı." }).then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
          return;
        }
        const del = await ActionEntry.findOneAndDelete({ guildId, groupId, entryId: n });
        if (!del) {
          await triggerMessage.channel.send({ content: `❌ ${n} numaralı entry bulunamadı.` }).then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
          return;
        }
        await triggerMessage.channel.send({ content: `entryId \`${n}\` silindi.` }).then(m => setTimeout(() => m.delete().catch(() => {}), 3500));
        await refreshEditor();
      } catch (e) {
        if (e && e.message && e.message.includes('time')) {
          await triggerMessage.channel.send({ content: "⏰ Süre doldu." }).then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
        }
      }
      return;
    }
  });

  collector.on('end', () => {
    activeRef.closed = true;
    try {
      editorMsg.edit({ components: [] }).catch(() => {});
    } catch {}
  });

  const msgCollector = triggerMessage.channel.createMessageCollector({
    filter: (m) => m.author.id === authorId && EXIT_WORDS.includes(m.content.trim().toLowerCase()),
    max: 1,
    time: 30 * 60_000
  });
  msgCollector.on('collect', async (m) => {
    try { await m.delete().catch(() => {}); } catch {}
    activeRef.closed = true;
    collector.stop('exit');
  });
}
