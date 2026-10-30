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
			{ id: 9, name: "Spotify Light Tema", price: 3000, type: 'theme', module: 'spotify', slug: 'light' },
			
			{ id: 10, emoji: '📜', name: "Evlat Edinme Belgesi", price: 10000, type: 'item', module: 'certificate', slug: 'adoption_certificate' },
			{ id: 11, emoji: '📄', name: "Hayvan Edinme İzni Belgesi", price: 25000, type: 'item', module: 'certificate', slug: 'adopt_pet' },
			
			{ id: 12, emoji: '🐕', name: "Golden Retriever", price: 15000, type: 'item', module: 'pet', slug: 'golden_retriever', description: 'Sevimli ve sadık köpek', species: 'dog' },
			{ id: 13, emoji: '🐕', name: "Husky", price: 20000, type: 'item', module: 'pet', slug: 'husky', description: 'Enerjik ve bağımsız köpek', species: 'dog' },
			{ id: 14, emoji: '🐕', name: "Pitbull", price: 18000, type: 'item', module: 'pet', slug: 'pitbull', description: 'Güçlü ve koruyucu köpek', species: 'dog' },
			{ id: 15, emoji: '🐕', name: "Corgi", price: 25000, type: 'item', module: 'pet', slug: 'corgi', description: 'Kısa bacaklı ve şirin köpek', species: 'dog' },
			{ id: 16, emoji: '🐕', name: "Shiba Inu", price: 50000, type: 'item', module: 'pet', slug: 'shiba_inu', description: 'Meşhur meme köpeği', species: 'dog' },
			
			{ id: 17, emoji: '🐱', name: "Tekir Kedi", price: 10000, type: 'item', module: 'pet', slug: 'tabby_cat', description: 'Sokak kedisi, dayanıklı', species: 'cat' },
			{ id: 18, emoji: '🐱', name: "British Shorthair", price: 22000, type: 'item', module: 'pet', slug: 'british_shorthair', description: 'Tombul ve tatlı kedi', species: 'cat' },
			{ id: 19, emoji: '🐱', name: "Persian", price: 28000, type: 'item', module: 'pet', slug: 'persian_cat', description: 'Uzun tüylü ve asil kedi', species: 'cat' },
			{ id: 20, emoji: '🐱', name: "Siamese", price: 35000, type: 'item', module: 'pet', slug: 'siamese_cat', description: 'Konuşkan ve zeki kedi', species: 'cat' },
			{ id: 21, emoji: '🐱', name: "Sphynx", price: 60000, type: 'item', module: 'pet', slug: 'sphynx_cat', description: 'Tüysüz ve egzotik kedi', species: 'cat' },
			
			{ id: 22, emoji: '🐰', name: "Holland Lop", price: 8000, type: 'item', module: 'pet', slug: 'holland_lop', description: 'Küçük ve sarkan kulaklı tavşan', species: 'rabbit' },
			{ id: 23, emoji: '🐰', name: "Angora Tavşan", price: 12000, type: 'item', module: 'pet', slug: 'angora_rabbit', description: 'Uzun tüylü beyaz tavşan', species: 'rabbit' },
			{ id: 24, emoji: '🐰', name: "Rex Tavşan", price: 15000, type: 'item', module: 'pet', slug: 'rex_rabbit', description: 'Kadife tüylü tavşan', species: 'rabbit' },
			
			{ id: 25, emoji: '🐹', name: "Syrian Hamster", price: 5000, type: 'item', module: 'pet', slug: 'syrian_hamster', description: 'Tek yaşayan, büyük hamster', species: 'hamster' },
			{ id: 26, emoji: '🐹', name: "Dwarf Hamster", price: 6000, type: 'item', module: 'pet', slug: 'dwarf_hamster', description: 'Minik ve hızlı hamster', species: 'hamster' },
			
			{ id: 27, emoji: '🦁', name: "Aslan", price: 100000, type: 'item', module: 'pet', slug: 'lion', description: 'Ormanların kralı, efsanevi hayvan', species: 'lion' },
			
			{ id: 28, emoji: '🎀', name: "Pembe Fiyonk", price: 2000, type: 'item', module: 'pet_accessory', slug: 'pink_bow', description: 'Şirin pembe fiyonk' },
			{ id: 29, emoji: '🔴', name: "Kırmızı Tasma", price: 3000, type: 'item', module: 'pet_accessory', slug: 'red_collar', description: 'Klasik kırmızı tasma' },
			{ id: 30, emoji: '👑', name: "Altın Taç", price: 10000, type: 'item', module: 'pet_accessory', slug: 'gold_crown', description: 'Lüks altın taç' },
			{ id: 31, emoji: '🕶️', name: "Güneş Gözlüğü", price: 5000, type: 'item', module: 'pet_accessory', slug: 'sunglasses', description: 'Havalı güneş gözlüğü' },
			{ id: 32, emoji: '🎩', name: "Silindir Şapka", price: 7500, type: 'item', module: 'pet_accessory', slug: 'top_hat', description: 'Centilmen şapkası' },
			{ id: 33, emoji: '👕', name: "Tişört", price: 4000, type: 'item', module: 'pet_accessory', slug: 'tshirt', description: 'Rahat tişört' },
			{ id: 34, emoji: '🦴', name: "Kemik Oyuncak", price: 1500, type: 'item', module: 'pet_accessory', slug: 'bone_toy', description: 'Çiğneme kemik oyuncağı' },
			{ id: 35, emoji: '🎾', name: "Tenis Topu", price: 1000, type: 'item', module: 'pet_accessory', slug: 'tennis_ball', description: 'Oyun için tenis topu' },
		];
		
		try {
			let createdCount = 0;
			let updatedCount = 0;
			
			for (const item of shopItems) {
				// Önce aynı module+slug'a sahip FARKLI ID'li kayıtları temizle
				await Shop.deleteMany({ 
					module: item.module, 
					slug: item.slug, 
					id: { $ne: item.id } 
				});
				
				// Şimdi ID ile bul
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
					if (existing.description !== item.description) {
						existing.description = item.description;
						hasChanges = true;
					}
					if (existing.species !== item.species) {
						existing.species = item.species;
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
