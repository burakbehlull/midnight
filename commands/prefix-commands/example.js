import { PermissionsManager } from '../../managers/index.js';

export default {
  name: 'example',
  description: 'Example command, replies with pong.',
  async execute(client, message, args) {
    try {
      const PM = new PermissionsManager(message);

      const IsRoles = await PM.isRoles();
      const IsOwner = await PM.isOwner();
      const IsAuthority = await PM.isAuthority(PM.flags.BanMembers, PM.flags.Administrator);

      const checks = [];
      if (PM.permissions.isRole) checks.push(IsRoles);
      if (PM.permissions.isOwners) checks.push(IsOwner);
      if (PM.permissions.isAuthority) checks.push(IsAuthority);

      const hasAtLeastOnePermission = checks.includes(true);
		console.log(IsRoles, IsOwner, IsAuthority)
		console.log(checks)
      if (!hasAtLeastOnePermission) {
        return message.reply('❌ Bu komutu kullanmak için yetkin yok.');
      }

      message.reply('Example! 🏓');
    } catch (err) {
      console.error('error: ', err);
    }
  },
};
