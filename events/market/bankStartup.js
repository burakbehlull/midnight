import { Events } from 'discord.js';
import { bankHelper } from '#helpers';

const { ensureCentralBank, processBankInterest } = bankHelper;

const ONE_HOUR = 60 * 60 * 1000;

export default {
  name: Events.ClientReady,
  once: true,
  async execute() {
    try {
      const bank = await ensureCentralBank();
      console.log(`[Bank] ${bank.name} hazır.`);
    } catch (e) {
      console.error('[Bank] Merkez bankası kurulum hatası:', e.message);
    }

    const runInterest = async () => {
      try {
        const res = await processBankInterest();
        if (res.matured > 0 || res.loansUpdated > 0) {
          console.log(
            `[Bank] Faiz işlendi → vadesi dolan: ${res.matured}, ödenen: ${res.paid} coin, güncel kredi: ${res.loansUpdated}`
          );
        }
      } catch (e) {
        console.error('[Bank] Faiz işleme hatası:', e.message);
      }
    };

    runInterest();
    setInterval(runInterest, ONE_HOUR);
  },
};
