import Manager from '#managers';

export default {
  name: 'ping',
  description: 'Example command, ping.',
  permissions: {
    authorities: [],
    user: ['470548458072440842'],
    roles: []
  },
  async execute(client, message, args) {
    try {
      const manager = new Manager(client, { action: message });
	
      const ping = client.ws.ping

      await manager.sender.reply(`Ping: ${ping}ms`);

    } catch (err) {
      console.error('error: ', err);
    }
  },
};
