import Manager from '#managers';

export default {
  name: 'ping',
  description: 'Example command, ping.',
  async execute(client, message, args) {
    try {
      const manager = new Manager(client, { action: message });
	
      if(!manager.config.DEVELOPMENT_MODE) return await manager.sender.reply(manager.sender.errorEmbed('Geliştirme modunda değilim, bu komutu kullanamazsınız!'));
      
      await sender.reply("Pong! 🏓");

    } catch (err) {
      console.error('error: ', err);
    }
  },
};
