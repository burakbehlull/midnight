import Manager from '#managers';
import { PermissionFlagsBits, ComponentType, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import { Button } from '#helpers';

const MAX_OPTIONS = 25;

export default {
  name: 'role',
  description: 'Kullanıcıya select menü üzerinden rol ekler veya kaldırır.',
  aliases: ['rol', 'r'],
  usage: '.role @kullanıcı | .role kullanıcıID',
  category: 'moderation',

  permissions: {
    authorities: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });

    try {
      let member = message.mentions.members.first();
      if (!member && args[0]) {
        const fetchedMember = await message.guild.members.fetch(args[0]).catch(() => null);
        if (fetchedMember) member = fetchedMember;
      }

      if (!member) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Kullanıcıyı etiketlemeli veya geçerli bir ID girmelisin!'));
      }

      const isOwnerOrBotOwner = await manager.authority.checkOwnerAndBotOwners();
      const authorHighest = message.member.roles.highest;

      const botMember = message.guild.members.cache.get(client.user.id);
      const botHighest = botMember.roles.highest;

      let manageableRoles = message.guild.roles.cache
        .filter(r => {
          if (r.id === message.guild.id) return false;          // @everyone
          if (!isOwnerOrBotOwner && r.position >= authorHighest.position) return false;
          if (r.position >= botHighest.position) return false;
          return true;
        })
        .sort((a, b) => b.position - a.position)
        .first(MAX_OPTIONS);

      if (manageableRoles.length === 0) {
        return manager.sender.reply(manager.sender.errorEmbed(
          `❌ Yönetebileceğin hiçbir rol yok!\n\n` +
          `*Not: Sadece kendi rolünün ve bot rolünün ALTINDAKİ rolleri yönetebilirsin.*`
        ));
      }

      const selectOptions = manageableRoles.map(role => ({
        label: role.name.length > 100 ? role.name.slice(0, 97) + '...' : role.name,
        value: role.id,
        description: `Pozisyon: ${role.position} | Üye: ${role.members.size}`,
      }));

      const selectedRoles = new Set();

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('role_select')
        .setPlaceholder('Rol(ler) seç... (en fazla 25)')
        .setMinValues(1)
        .setMaxValues(Math.min(manageableRoles.length, 25))
        .addOptions(selectOptions);

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);

      const btn = new Button();
      btn.add('role_add', '➕ Ekle', btn.style.Success);
      btn.add('role_remove', '➖ Kaldır', btn.style.Danger);
      const buttonRow = btn.build();

      const embed = manager.sender.embed({
        title: `🎭 Rol Yönetimi — ${member.user.username}`,
        description:
          `Aşağıdan bir veya birden fazla **rol seç**, ardından **Ekle** veya **Kaldır** butonuna bas.\n\n` +
          `**Hedef:** ${member}\n` +
          `**Toplam Yönetilebilir Rol:** ${manageableRoles.length}${manageableRoles.length >= MAX_OPTIONS ? ` (ilk ${MAX_OPTIONS} gösteriliyor)` : ''}`,
        color: 0x0099FF,
      });

      const reply = await message.channel.send({
        embeds: [embed],
        components: [selectRow, buttonRow],
      });

      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 120_000,
        filter: (i) => i.user.id === message.author.id,
      });

      const buttonCollector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000,
        filter: (i) => i.user.id === message.author.id,
      });

      collector.on('collect', async (interaction) => {
        selectedRoles.clear();
        for (const id of interaction.values) selectedRoles.add(id);

        await interaction.deferUpdate().catch(() => {});
      });

      buttonCollector.on('collect', async (interaction) => {
        await interaction.deferUpdate().catch(() => {});

        const roleIds = Array.from(selectedRoles);
        if (roleIds.length === 0) {
          const warn = manager.sender.errorEmbed('❌ Önce listeden en az bir rol seçmelisin!');
          return message.channel.send({ embeds: [warn] }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }

        const isAdd = interaction.customId === 'role_add';
        const results = { success: [], failed: [] };

        for (const roleId of roleIds) {
          const role = message.guild.roles.cache.get(roleId);
          if (!role) {
            results.failed.push({ id: roleId, reason: 'Rol bulunamadı.' });
            continue;
          }

          const hasRole = member.roles.cache.has(role.id);

          if (isAdd && hasRole) {
            results.failed.push({ id: role.id, reason: 'Kullanıcı zaten bu role sahip.' });
            continue;
          }
          if (!isAdd && !hasRole) {
            results.failed.push({ id: role.id, reason: 'Kullanıcı bu role sahip değil.' });
            continue;
          }

          if (!isOwnerOrBotOwner) {
            if (role.position >= authorHighest.position) {
              results.failed.push({ id: role.id, reason: 'Bu rolü yönetemezsin (kendi rolünün altında olmalı).' });
              continue;
            }
          }
          if (role.position >= botHighest.position) {
            results.failed.push({ id: role.id, reason: 'Bot bu rolü yönetemez (bot rolünün altında olmalı).' });
            continue;
          }

          try {
            if (isAdd) {
              await member.roles.add(role);
              results.success.push(role.id);
            } else {
              await member.roles.remove(role);
              results.success.push(role.id);
            }
          } catch (e) {
            results.failed.push({ id: role.id, reason: e.message || 'Bilinmeyen hata.' });
          }
        }

        const successList = results.success.map(id => `<@&${id}>`).join(', ');
        const failedList = results.failed
          .map(f => `<@&${f.id}> — ${f.reason}`)
          .join('\n');

        let desc = '';
        if (successList) {
          desc += `**Başarılı (${results.success.length}):** ${successList}\n\n`;
        }
        if (failedList) {
          desc += `❌ **Başarısız (${results.failed.length}):**\n${failedList}`;
        }
        if (!desc) desc = 'İşlem gerçekleştirilemedi.';

        const resultEmbed = manager.sender.embed({
          title: isAdd ? '➕ Rol Ekleme Sonucu' : '➖ Rol Kaldırma Sonucu',
          description: desc,
          color: results.failed.length === 0 ? 0x00FF00 : 0xFFA500,
        });

        message.channel.send({ embeds: [resultEmbed] });


        collector.stop('done');
        buttonCollector.stop('done');
        reply.edit({ components: [] }).catch(() => {});
      });

      collector.on('end', () => {
        reply.edit({ components: [] }).catch(() => {});
      });
      buttonCollector.on('end', () => {
      });

    } catch (error) {
      console.error('Hata:', error.message);
      return manager.sender.reply(manager.sender.errorEmbed('❌ Bir hata oluştu.'));
    }
  }
};
