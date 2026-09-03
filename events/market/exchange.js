import { Events } from 'discord.js';
import { marketHelper } from '#helpers';

const { getOrCreateMarket, updateMarketPrices } = marketHelper

export default {
    name: Events.ClientReady,
    once: true,
    async execute() {
        try {
            await getOrCreateMarket();
            console.log('[Market] Piyasa verileri hazır.');
        } catch (e) {
            console.error('[Market] Piyasa kurulum hatası:', e.message);
        }

        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
        setInterval(async () => {
            try {
                const updated = await updateMarketPrices();
                if (updated) {
                    console.log('[Market] Fiyatlar güncellendi (12 saatlik periyot). Toplam varlık:', updated.items?.length || 0);
                }
            } catch (e) {
                console.error('[Market] Fiyat güncelleme hatası:', e.message);
            }
        }, TWELVE_HOURS);
        
    },
};
