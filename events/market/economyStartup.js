import { Events } from 'discord.js';
import { Shop } from '#models'

export default {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		
		// economy
		const shopItems = [
			{ id: 1, name: 'Kalp', price: 200, type: 'item', module: null, slug: null },
			{ id: 2, name: 'Gümüş Yüzük', price: 1000, type: 'item', module: 'ring', slug: 'silver_ring' },
			{ id: 3, name: 'Altın Yüzük', price: 10000, type: 'item', module: 'ring', slug: 'gold_ring' },
			{ id: 4, name: 'Elmas Yüzük', price: 100000, type: 'item', module: 'ring', slug: 'diamond_ring' },
			{ id: 5, name: 'Evlat Edinme Belgesi', price: 10000, type: 'item', module: 'certificate', slug: 'adoption_certificate' },
			{ id: 6, name: 'Spotify Light Tema', price: 3000, type: 'theme', module: 'spotify', slug: 'light' }
		];
		
		
		for (const item of shopItems) {
		  const existing = await Shop.findOne({ id: item.id });
		  if (!existing) {
			await Shop.create(item);
		  } else if (existing.module !== item.module || existing.slug !== item.slug || existing.type !== item.type) {
			existing.module = item.module;
			existing.slug = item.slug;
			existing.type = item.type;
			existing.name = item.name;
			await existing.save();
		  }
		}
		// economy -/
		
	},
};
