import Manager from '#managers';
import { misc } from '#helpers';

const { delay } = misc;

export default {
  name: 'patlat',
  category: 'fun',
  description: 'Sunucuyu patlatma şaka komutu.',
  permissions: {
    enabled: false
  },
  async execute(client, message, args) {
    try {
      const manager = new Manager(client, { action: message });

      await manager.sender.reply("Sunucu kontrol ediliyor..");
      await delay(2000);

      await message.channel.send("Roller siliniyor..");
      await delay(2000);

      await message.channel.send("Üye bilgileri alınıyor..");
      await delay(2000);

      await message.channel.send("Kanal bilgileri alınıyor..");
      await delay(2000);

      await message.channel.send("Kanallar siliniyor..");
      await delay(2000);

      await message.channel.send("Aynen patlattın yarram");

    } catch (err) {
      console.error('error: ', err);
    }
  },
};