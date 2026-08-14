import Manager from '#managers';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  name: 'patlat',
  category: 'fun',
  description: 'Sunucuyu patlatma şaka komutu.',
  permissions: {
    authorities: [],
    user: ['470548458072440842'],
    roles: []
  },
  async execute(client, message, args) {
    try {
      const manager = new Manager(client, { action: message });

      await manager.sender.reply("Sunucu kontrol ediliyor..");
      await delay(2000);

      await manager.sender.reply("Roller siliniyor..");
      await delay(2000);

      await message.channel.send("Üye bilgileri alınıyor..");
      await delay(2000);

      await message.channel.send("Kanal bilgileri alınıyor..");
      await delay(2000);

      await message.channel.send("Kanallar siliniyor..");
      await delay(2000);

      await message.channel.send("💥 **Sunucu patlatıldı!**");

    } catch (err) {
      console.error('error: ', err);
    }
  },
};