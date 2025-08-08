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
		  { id: 4, name: 'Elmas Yüzük', price: 100000 }
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
