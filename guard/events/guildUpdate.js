export default {
  name: 'guildUpdate',
  once: false,
  async execute(client, oldGuild, newGuild) {
    try {
      if (!client.guardManager) return;
      
      if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
        await client.guardManager.handleVanityUpdate(oldGuild, newGuild);
      } else {
        await client.guardManager.handleGuildUpdate(oldGuild, newGuild);
      }
    } catch (error) {
      console.error('guildUpdate event hatası:', error);
    }
  }
};
