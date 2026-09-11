import { Events, MessageFlags, EmbedBuilder } from 'discord.js';
import { boosterRoleHandler } from '#handlers';
import { Modal } from '#helpers';

async function checkIfBooster(member) {
  return member.roles.cache.some(role => role.tags && role.tags.premiumSubscriberRole);
}

async function boosterInteractionHandler(interaction) {
  try {
    const isBoosterButton = interaction.isButton() && interaction.customId.startsWith('booster_');
    const isBoosterModal = interaction.isModalSubmit() && interaction.customId.startsWith('booster_');
    
    if (!isBoosterButton && !isBoosterModal) return;

    const member = interaction.member;
    const guild = interaction.guild;

    const isBooster = await checkIfBooster(member);
    if (!isBooster) {
      return await interaction.reply({
        content: '❌ Bu panel sadece boosterlar içindir!',
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.isButton()) {
      
      if (interaction.customId === 'booster_create') {
        const modal = new Modal('booster_create_modal', 'Rol Oluştur');
        modal.add('rolname', 'Rol Adı', {
          placeholder: 'Rol adını giriniz (Maks. 100 karakter)',
          required: true,
          max: 100
        });
        modal.add('color', 'Renk', {
          placeholder: '#FF5733 veya 16734003',
          required: false
        });
        modal.add('emojiId', 'Emoji ID', {
          placeholder: 'Discord emoji ID (17-19 haneli)',
          required: false
        });
        return await interaction.showModal(modal.build());
      }

      if (interaction.customId === 'booster_edit') {
        const roleInfo = await boosterRoleHandler.getRoleInfo(guild, member);
        
        if (!roleInfo.success) {
          return await interaction.reply({
            content: roleInfo.message,
            flags: MessageFlags.Ephemeral
          });
        }

        const modal = new Modal('booster_edit_modal', 'Rol Düzenle');
        modal.add('rolname', 'Rol Adı', {
          value: roleInfo.roleData.name,
          placeholder: roleInfo.roleData.name,
          required: false,
          max: 100
        });
        modal.add('color', 'Renk', {
          value: roleInfo.roleData.color,
          placeholder: roleInfo.roleData.color,
          required: false
        });
        modal.add('emojiId', 'Emoji ID', {
          value: roleInfo.roleData.emojiId || '',
          placeholder: roleInfo.roleData.emojiId || 'Emoji ID',
          required: false
        });
        return await interaction.showModal(modal.build());
      }

      if (interaction.customId === 'booster_nickname') {
        const modal = new Modal('booster_nickname_modal', 'İsim Değiştir');
        modal.add('nickname', 'Yeni İsim', {
          placeholder: 'Yeni isminizi giriniz (Maks. 32 karakter)',
          value: member.displayName,
          required: true,
          max: 32
        });
        return await interaction.showModal(modal.build());
      }

      if (interaction.customId === 'booster_add_member') {
        const roleInfo = await boosterRoleHandler.getRoleInfo(guild, member);
        
        if (!roleInfo.success) {
          return await interaction.reply({
            content: roleInfo.message,
            flags: MessageFlags.Ephemeral
          });
        }

        const modal = new Modal('booster_add_member_modal', 'Role Üye Ekle');
        modal.add('userId', 'Kullanıcı ID', {
          placeholder: 'Eklemek istediğiniz kullanıcının ID\'sini giriniz',
          required: true
        });
        return await interaction.showModal(modal.build());
      }

      if (interaction.customId === 'booster_info') {
        const roleInfo = await boosterRoleHandler.getRoleInfo(guild, member);
        
        if (!roleInfo.success) {
          return await interaction.reply({
            content: roleInfo.message,
            flags: MessageFlags.Ephemeral
          });
        }

        const { roleData } = roleInfo;
        const embed = new EmbedBuilder()
          .setTitle('📋 Rol Bilgisi')
          .setColor(roleData.role.color || '#f47fff')
          .addFields(
            { name: '🎭 Rol', value: `${roleData.role}`, inline: true },
            { name: '🎨 Renk', value: roleData.color, inline: true },
            { name: '😀 Emoji ID', value: roleData.emojiId || 'Yok', inline: true },
            { name: '👥 Üye Sayısı', value: `${roleData.memberCount}`, inline: true },
            { name: '📅 Oluşturma', value: `<t:${Math.floor(roleData.createdAt.getTime() / 1000)}:R>`, inline: true },
            { name: '✏️ Son Düzenleme', value: `<t:${Math.floor(roleData.lastEdited.getTime() / 1000)}:R>`, inline: true },
            { name: '👤 Role Sahip Üyeler', value: roleData.members, inline: false }
          )
          .setFooter({ text: member.displayName, iconURL: member.user.avatarURL() })
          .setTimestamp();

        return await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral
        });
      }

      if (interaction.customId === 'booster_delete') {
        const result = await boosterRoleHandler.deleteBoosterRole(guild, member);
        
        return await interaction.reply({
          content: result.message,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (interaction.isModalSubmit()) {
      
      if (interaction.customId === 'booster_create_modal') {
        const roleName = interaction.fields.getTextInputValue('rolname');
        const color = interaction.fields.getTextInputValue('color') || null;
        const emojiId = interaction.fields.getTextInputValue('emojiId') || null;

        const result = await boosterRoleHandler.createBoosterRole(
          guild,
          member,
          roleName,
          color,
          emojiId
        );

        return await interaction.reply({
          content: result.message,
          flags: MessageFlags.Ephemeral
        });
      }

      if (interaction.customId === 'booster_edit_modal') {
        const roleName = interaction.fields.getTextInputValue('rolname') || null;
        const color = interaction.fields.getTextInputValue('color') || null;
        const emojiId = interaction.fields.getTextInputValue('emojiId') || null;

        const result = await boosterRoleHandler.editBoosterRole(
          guild,
          member,
          roleName,
          color,
          emojiId
        );

        return await interaction.reply({
          content: result.message,
          flags: MessageFlags.Ephemeral
        });
      }

      if (interaction.customId === 'booster_nickname_modal') {
        const nickname = interaction.fields.getTextInputValue('nickname');

        const result = await boosterRoleHandler.changeNickname(member, nickname);

        return await interaction.reply({
          content: result.message,
          flags: MessageFlags.Ephemeral
        });
      }

      if (interaction.customId === 'booster_add_member_modal') {
        const userId = interaction.fields.getTextInputValue('userId').trim();

        const result = await boosterRoleHandler.addMemberToRole(
          guild,
          member,
          userId
        );

        return await interaction.reply({
          content: result.message,
          flags: MessageFlags.Ephemeral
        });
      }
    }

  } catch (error) {
    console.error('Booster interaction hatası:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      return await interaction.reply({
        content: '❌ Bir hata oluştu. Lütfen tekrar deneyin.',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  }
}

export default {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
    await boosterInteractionHandler(interaction);
  }
};

export { boosterInteractionHandler };
