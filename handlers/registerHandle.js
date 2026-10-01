import { Settings } from "#models";
import { MessageFlags } from 'discord.js';

export default async function selfRegisterButtonHandler(interaction) {
  if (!interaction.isButton()) return false;
  const id = interaction.customId;
  if (!id.startsWith('sr_')) return false;

  if (!interaction.guild || !interaction.member) {
    interaction.reply({ content: '❌ Bu işlem sadece sunucularda yapılabilir.', flags: MessageFlags.Ephemeral }).catch(() => {});
    return true;
  }

  const settings = await Settings.findOne({ guildId: interaction.guild.id });
  if (!settings || !settings.selfRegisterMode) {
    interaction.reply({ content: '❌ Sunucuda self register sistemi aktif değil.', flags: MessageFlags.Ephemeral }).catch(() => {});
    return true;
  }

  const member = interaction.member;
  let roleToGive = null;
  let roleLabel = '';

  if (id === 'sr_single') {
    if (settings.selfRegisterMode !== 'single') {
      interaction.reply({ content: '❌ Bu butonun modu değiştirilmiş, güncel mesajı kullanın.', flags: MessageFlags.Ephemeral }).catch(() => {});
      return true;
    }
    if (!settings.selfRegisterRoleId) {
      interaction.reply({ content: '❌ Kayıt rolü ayarlanmamış.', flags: MessageFlags.Ephemeral }).catch(() => {});
      return true;
    }
    roleToGive = settings.selfRegisterRoleId;
    roleLabel = 'Kayıt';
  } else if (id === 'sr_erkek') {
    if (settings.selfRegisterMode !== 'dual') {
      interaction.reply({ content: '❌ Bu butonun modu değiştirilmiş, güncel mesajı kullanın.', flags: MessageFlags.Ephemeral }).catch(() => {});
      return true;
    }
    if (!settings.selfRegisterErkekRoleId) {
      interaction.reply({ content: '❌ Erkek rolü ayarlanmamış.', flags: MessageFlags.Ephemeral }).catch(() => {});
      return true;
    }
    roleToGive = settings.selfRegisterErkekRoleId;
    roleLabel = 'Erkek';
  } else if (id === 'sr_kiz') {
    if (settings.selfRegisterMode !== 'dual') {
      interaction.reply({ content: '❌ Bu butonun modu değiştirilmiş, güncel mesajı kullanın.', flags: MessageFlags.Ephemeral }).catch(() => {});
      return true;
    }
    if (!settings.selfRegisterKizRoleId) {
      interaction.reply({ content: '❌ Kız rolü ayarlanmamış.', flags: MessageFlags.Ephemeral }).catch(() => {});
      return true;
    }
    roleToGive = settings.selfRegisterKizRoleId;
    roleLabel = 'Kız';
  } else {
    return false;
  }

  try {
    const role = await interaction.guild.roles.fetch(roleToGive).catch(() => null);
    if (!role) {
      interaction.reply({ content: '❌ Rol bulunamadı (silinmiş olabilir). Yönetici kurulumu tekrar yapmalı.', flags: MessageFlags.Ephemeral }).catch(() => {});
      return true;
    }

    if (member.roles.cache.has(role.id)) {
      interaction.reply({
        content: `Zaten **${role.name}** rolüne sahipsin. Tekrar kayıt olmana gerek yok!`,
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
      return true;
    }

    const removedDual = [];
    if (settings.selfRegisterMode === 'dual') {
      if (settings.selfRegisterErkekRoleId && member.roles.cache.has(settings.selfRegisterErkekRoleId)) {
        try { await member.roles.remove(settings.selfRegisterErkekRoleId); removedDual.push('Erkek'); } catch {}
      }
      if (settings.selfRegisterKizRoleId && member.roles.cache.has(settings.selfRegisterKizRoleId)) {
        try { await member.roles.remove(settings.selfRegisterKizRoleId); removedDual.push('Kız'); } catch {}
      }
    }

    await member.roles.add(role.id);

    if (settings.kayitsizRoleId && member.roles.cache.has(settings.kayitsizRoleId)) {
      try { await member.roles.remove(settings.kayitsizRoleId); } catch {}
    }

    const removeMsg = removedDual.length > 0 ? ` (Eski ${removedDual.join(' / ')} rolü kaldırıldı)` : '';
    interaction.reply({
      content: `Başarıyla **${role.name}** rolüyle kayıt oldun!${removeMsg} Hoş geldin 🎉`,
      flags: MessageFlags.Ephemeral
    }).catch(() => {});

  } catch (err) {
    console.error('[selfRegister] hata:', err);
    interaction.reply({
      content: `❌ Rol verilirken hata oluştu. Botun yetkisi yetersiz olabilir.\nDetay: \`${err?.message || String(err).slice(0, 100)}\``,
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }

  return true;
}

