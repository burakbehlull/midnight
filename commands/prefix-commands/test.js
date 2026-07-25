import { PermissionsManager } from '#managers';
import Manager from '../../managers/Manager.js';
export default {
  name: 'test',
  description: 'Example command, test.',
  async execute(client, message, args) {
    try {
        const manager = new Manager(client, { action: message });
        const mac = await manager.authority.control()
        
        const theme = await manager.theme.embedThemeBuilder('success', {
            action: true,
            author: manager.theme.getNameAndAvatars("user", message),
            description: "Test komutu başarıyla çalıştı! ✅",
            footer: manager.theme.getNameAndAvatars("guild", message), 
        })

        await theme.reply({ephemeral: true}) 
        // message.reply({ embeds: [theme] });
        
    } catch (err) {
      console.error('error: ', err);
    }
  },
};
