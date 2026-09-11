import { Events } from 'discord.js';

export default {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		try {
            await client.application.fetch();
            console.log('✅ Application bilgisi (emojiler dahil) fetch edildi.');

            const emojiCount = client.application?.emojis?.cache?.size ?? 0;
            if (emojiCount > 0) {
                console.log(`   → Yüklü uygulama emojisi: ${emojiCount} adet`);
            } else {
                console.log('   → Henüz uygulama emojisi yüklenmemiş.');
            }
        } catch (err) {
            console.warn('⚠️ Application fetch başarısız oldu (emojiler elle fetch edilmek zorunda kalacak):', err?.message || err);
        }
	},
};
