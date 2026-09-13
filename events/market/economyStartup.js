import { Events } from 'discord.js';
import { Shop } from '#models'
import { emoji } from '#data'

export default {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		
		const emojis = emoji.default || emoji;
		
		// economy
		const shopItems = [
			
			{ id: 1, emoji: emojis.heart, name: "Kalp", price: 200, type: 'item', module: 'consumable', slug: 'heart_item' },
			{ id: 2, emoji: emojis.silver_ring, name: "Gümüş Yüzük", price: 100, type: 'item', module: 'ring', slug: 'silver_ring' },
			{ id: 3, emoji: emojis.gold_ring, name: "Altın Yüzük", price: 1000, type: 'item', module: 'ring', slug: 'gold_ring' },
			{ id: 4, emoji: emojis.ruby_ring, name: "Yakut Yüzük", price: 5000, type: 'item', module: 'ring', slug: 'ruby_ring' },
			{ id: 5, emoji: emojis.dia_ring, name: "Elmas Yüzük", price: 10000, type: 'item', module: 'ring', slug: 'diamond_ring' },
			{ id: 6, emoji: emojis.magic_ring, name: "Büyü Yüzüğü", price: 100000, type: 'item', module: 'ring', slug: 'magic_ring' },
			{ id: 7, emoji: emojis.king_ring, name: "Kral Yüzüğü", price: 500000, type: 'item', module: 'ring', slug: 'king_ring' },
			{ id: 8, emoji: emojis.god_ring, name: "Tanrı Yüzüğü", price: 1000000, type: 'item', module: 'ring', slug: 'god_ring' },
			
			{ id: 9, name: "Evlat Edinme Belgesi", price: 10000, type: 'item', module: 'certificate', slug: 'adoption_certificate' },
			{ id: 10, name: "Spotify Light Tema", price: 3000, type: 'theme', module: 'spotify', slug: 'light' },
		];
		
		try {
			let createdCount = 0;
			let updatedCount = 0;
			
			for (const item of shopItems) {
				const existing = await Shop.findOne({ id: item.id });
				
				if (!existing) {
					await Shop.create(item);
					createdCount++;
				} else {
					let hasChanges = false;
					
					if (existing.name !== item.name) {
						existing.name = item.name;
						hasChanges = true;
					}
					if (existing.price !== item.price) {
						existing.price = item.price;
						hasChanges = true;
					}
					if (existing.emoji !== item.emoji) {
						existing.emoji = item.emoji;
						hasChanges = true;
					}
					if (existing.type !== item.type) {
						existing.type = item.type;
						hasChanges = true;
					}
					if (existing.module !== item.module) {
						existing.module = item.module;
						hasChanges = true;
					}
					if (existing.slug !== item.slug) {
						existing.slug = item.slug;
						hasChanges = true;
					}
					
					if (hasChanges) {
						await existing.save();
						updatedCount++;
					}
				}
			}
			
			const itemIds = shopItems.map(item => item.id);
			const deletedResult = await Shop.deleteMany({ id: { $nin: itemIds } });
			
			// Sonuç raporu
			if (createdCount > 0 || updatedCount > 0 || deletedResult.deletedCount > 0) {
				console.log(`[EconomyStartup] Mağaza güncellendi:`);
				if (createdCount > 0) console.log(`   → ${createdCount} yeni ürün eklendi`);
				if (updatedCount > 0) console.log(`   → ${updatedCount} ürün güncellendi`);
				if (deletedResult.deletedCount > 0) console.log(`   → ${deletedResult.deletedCount} ürün silindi`);
			} else {
				console.log(`[EconomyStartup] Mağaza güncel (${shopItems.length} ürün)`);
			}
		} catch (error) {
			console.error('❌ [EconomyStartup] Hata:', error);
		}
		// economy -/
		
	},
};
