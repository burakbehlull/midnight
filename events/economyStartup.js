import { Events } from 'discord.js';
import { Shop } from '#models'

export default {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		
		// economy
		const shopItems = [
			{ id: 1, name: 'Kalp', price: 200 },
			{ id: 2, name: 'Gümüş Yüzük', price: 1000 },
			{ id: 3, name: 'Altın Yüzük', price: 10000 },
			{ id: 4, name: 'Elmas Yüzük', price: 100000 },
			{ id: 5, name: 'Yılın Discord Kullanıcısı Kartı', price: 10000 },
			{ id: 6, name: 'Alamet Kartı', price: 2000 },
			{ id: 7, name: 'Midnight VIP', price: 500000 },
		];
		
		
		for (const item of shopItems) {
		  const existing = await Shop.findOne({ id: item.id });
		  if(existing) return
		  
		  if (!existing) {
			await Shop.create(item);
		  }
		}
		// economy -/
		
	},
};
