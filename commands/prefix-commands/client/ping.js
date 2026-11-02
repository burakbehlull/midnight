import Manager from '#managers';
import { performance } from 'perf_hooks';

export default {
  name: 'ping',
  description: 'Botun gecikme bilgilerini gösterir.',
  permissions: {
    authorities: [],
    user: ['470548458072440842'],
    roles: []
  },
  async execute(client, message, args) {
    try {
      const manager = new Manager(client, { action: message });

      const startTime = Date.now();
      const sentMessage = await manager.sender.reply('Ping hesaplanıyor...');
      const messageLatency = Date.now() - startTime;

      const gatewayPing = client.ws.ping;

      const restStart = performance.now();
      await sentMessage.edit('.');
      const restLatency = Math.round(performance.now() - restStart);

      const eventLoopStart = performance.now();
      await new Promise(resolve => setImmediate(resolve));
      const eventLoopDelay = ((performance.now() - eventLoopStart)).toFixed(3);

      let dbPing = 0;
      try {
        const dbStart = Date.now();
        if (client.db && client.db.connection) {
          await client.db.connection.db.admin().ping();
          dbPing = Date.now() - dbStart;
        }
      } catch (err) {
        dbPing = 0;
      }

      const embed = manager.sender.embed({
        author: { 
          name: message.author.username, 
          iconURL: message.author.displayAvatarURL({ dynamic: true }) 
        },
        description: [
          '**Client Heartbeat                Message Latency                Database Ping**',
          '',
          `**[** \`${gatewayPing}ms\` **]               [** \`${messageLatency}ms\` **]               [** \`${dbPing}ms\` **]**`,
          '',
          `# ${gatewayPing} ms`,
          '',
          `Gateway (WebSocket heartbeat): **${gatewayPing} ms**`,
          '',
          `Mesaj yanıtı (Discord zamanları): **${messageLatency} ms**`,
          '',
          `İlk yanıt gönderimi (REST ve kuyruk): **${restLatency} ms**`,
          '',
          `Event loop delay: **${eventLoopDelay} ms**`
        ].join('\n'),
        color: 0x2B2D31,
        footer: { text: `Created By ${message.author.username}` }
      });

      await sentMessage.edit({ content: '', embeds: [embed] });

    } catch (err) {
      console.error('ping command error:', err);
    }
  },
};
