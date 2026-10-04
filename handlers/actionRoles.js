import { ActionGroup, ActionEntry } from "../models/index.js";

const BTN_REGEX = /^actions_(.+?)_btn_(\d+)$/;

function safeReply(interaction, payload) {
  if (!interaction || typeof interaction.reply !== 'function') return Promise.resolve();
  try {
    if (interaction.deferred || interaction.replied) {
      return interaction.followUp({ ...payload, ephemeral: payload.ephemeral !== false }).catch(() => {});
    }
    return interaction.reply({ ...payload, ephemeral: payload.ephemeral !== false }).catch(() => {});
  } catch {
    try {
      return interaction.followUp({ ...payload, ephemeral: true }).catch(() => {});
    } catch {
      return Promise.resolve();
    }
  }
}

async function stripOtherGroupRoles(member, groupId, guild, keepRoleId) {
  try {
    if (!member || !groupId || !guild) return;
    const guildId = guild.id;
    const entries = await ActionEntry.find({ guildId, groupId }).select('roleId').lean().catch(() => []);
    if (!entries || entries.length === 0) return;
    const toRemove = new Set();
    for (const e of entries) {
      if (!e.roleId) continue;
      if (keepRoleId && String(e.roleId) === String(keepRoleId)) continue;
      toRemove.add(String(e.roleId));
    }
    if (toRemove.size === 0) return;
    const currentRoles = member.roles?.cache;
    if (!currentRoles) return;
    const removeArray = [];
    for (const id of toRemove) {
      if (currentRoles.has(id)) removeArray.push(id);
    }
    if (removeArray.length === 0) return;
    let botMember = guild.members.cache.get(guild.client?.user?.id);
    if (!botMember) {
      botMember = await guild.members.fetchMe().catch(() => null);
    }
    const filtered = [];
    for (const rId of removeArray) {
      const role = await guild.roles.fetch(rId).catch(() => null);
      if (!role) continue;
      if (botMember && role.position >= botMember.roles.highest.position) continue;
      filtered.push(rId);
    }
    if (filtered.length === 0) return;
    try {
      await member.roles.remove(filtered).catch(() => {});
    } catch {}
  } catch (e) {
    console.error('[stripOtherGroupRoles err]', e?.message || e);
  }
}

export async function actionButtonHandler(interaction) {
  try {
    if (!interaction) return false;
    const isBtn = typeof interaction.isButton === 'function' ? interaction.isButton() : !!interaction.customId;
    if (!isBtn) return false;
    const id = interaction.customId;
    if (!id || typeof id !== 'string') return false;
    if (!BTN_REGEX.test(id)) return false;

    const match = id.match(BTN_REGEX);
    if (!match) return false;
    const groupId = match[1];
    const entryId = parseInt(match[2], 10);
    if (isNaN(entryId)) return false;

    const guildId = interaction.guild?.id;
    if (!guildId) {
      await safeReply(interaction, { content: "❌ Bu işlem sadece sunucuda çalışır." });
      return true;
    }

    const entry = await ActionEntry.findOne({ guildId, groupId, entryId, type: 'button' }).lean().catch(() => null);
    if (!entry) {
      await safeReply(interaction, { content: "❌ Bu butonun kaydı bulunamadı." });
      return true;
    }

    const group = await ActionGroup.findOne({ guildId, groupId }).select('roleMode').lean().catch(() => null);
    const roleMode = group?.roleMode || 'multi';

    const role = await interaction.guild.roles.fetch(entry.roleId).catch(() => null);
    if (!role) {
      await safeReply(interaction, { content: "❌ Butona bağlı rol bulunamadı (silinmiş olabilir)." });
      return true;
    }

    const member = interaction.member;
    if (!member) {
      await safeReply(interaction, { content: "❌ Üye bilgisi alınamadı." });
      return true;
    }

    let botMember = interaction.guild.members.cache.get(interaction.client.user.id);
    if (!botMember) {
      botMember = await interaction.guild.members.fetchMe().catch(() => null);
    }
    if (botMember && role.position >= botMember.roles.highest.position) {
      await safeReply(interaction, { content: "❌ Bu rolü vermek için yetkim yetersiz (rol benim rolümden üstte)." });
      return true;
    }

    if (member.roles.cache.has(role.id)) {
      try {
        await member.roles.remove(role.id).catch(() => {});
        await safeReply(interaction, { content: `✅ Rolünüz kaldırıldı: <@&${role.id}>` });
      } catch {
        await safeReply(interaction, { content: "❌ Rol kaldırılamadı." });
      }
      return true;
    }

    try {
      if (roleMode === 'single') {
        await stripOtherGroupRoles(member, groupId, interaction.guild, role.id);
      }
      await member.roles.add(role.id).catch(() => {});
      let msg = `✅ Rol verildi: <@&${role.id}>`;
      if (roleMode === 'single') msg += `\n🎯 Tek Rol modu: eski roller temizlendi.`;
      await safeReply(interaction, { content: msg });
    } catch {
      await safeReply(interaction, { content: "❌ Rol verilemedi. Yetkim yetersiz." });
    }
    return true;
  } catch (e) {
    console.error('[actionButtonHandler error]', e?.message || e);
    try {
      await safeReply(interaction, { content: "❌ Bir hata oluştu." });
    } catch {}
    return true;
  }
}

export async function actionReactionAddHandler(reaction, user) {
  return actionReactionHandlerCore(reaction, user, false);
}

export async function actionReactionRemoveHandler(reaction, user) {
  return actionReactionHandlerCore(reaction, user, true);
}

async function actionReactionHandlerCore(reaction, user, isRemove) {
  try {
    if (!reaction || !user) return false;
    if (user.bot) return false;
    const message = reaction.message;
    if (!message || !message.guild) return false;
    const guildId = message.guild.id;
    const messageId = message.id;

    const group = await ActionGroup.findOne({
      guildId,
      setupMessageId: messageId,
      type: 'emoji'
    }).lean().catch(() => null);
    if (!group) return false;

    const emoji = reaction.emoji;
    if (!emoji) return false;
    const emojiId = emoji.id || null;
    const emojiName = emoji.name || null;

    const entries = await ActionEntry.find({
      guildId,
      groupId: group.groupId,
      type: 'emoji'
    }).lean().catch(() => null);
    if (!entries || entries.length === 0) return false;

    const matched = entries.find((e) => {
      if (emojiId && e.emojiId && e.emojiId === emojiId) return true;
      if (!emojiId && e.emojiName && e.emojiName === emojiName) return true;
      return false;
    });

    if (!matched) return false;

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return true;

    const role = await message.guild.roles.fetch(matched.roleId).catch(() => null);
    if (!role) return true;

    let botMember = message.guild.members.cache.get(message.client.user.id);
    if (!botMember) {
      botMember = await message.guild.members.fetchMe().catch(() => null);
    }
    if (botMember && role.position >= botMember.roles.highest.position) return true;

    const roleMode = group.roleMode || 'multi';

    if (isRemove) {
      try {
        if (member.roles.cache.has(role.id)) {
          await member.roles.remove(role.id).catch(() => {});
        }
      } catch {}
      return true;
    }

    try {
      if (roleMode === 'single') {
        await stripOtherGroupRoles(member, group.groupId, message.guild, matched.roleId);
      }
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role.id).catch(() => {});
      }
    } catch {}
    return true;
  } catch (e) {
    console.error('[actionReactionHandlerCore error]', e?.message || e);
    return false;
  }
}
