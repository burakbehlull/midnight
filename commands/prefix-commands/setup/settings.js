import { PermissionFlagsBits } from 'discord.js';
import Manager from '#managers';
import { settingsPanel } from '#helpers';

export default {
  name: 'settings',
  aliases: ['ayarlar', 'sunucuayar', 'panel'],
  description: 'Sunucunun tüm ayarlarını tek panelden yönetir.',
  usage: '.settings',
  category: 'setup',

  permissions: {
    enabled: false
  },

  async execute(client, message) {
    const manager = new Manager(client, { action: message });

    const ctrl = await manager.authority.checkOwnerAndBotOwners();

    if (!ctrl) return message.reply('❌ Bu paneli kullanmak için **Administrator** yetkisine sahip olmalısın.').catch(() => {});
    

    await settingsPanel.openSettingsPanel(client, message, manager);
  }
};
