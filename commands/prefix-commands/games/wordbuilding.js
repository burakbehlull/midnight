import { Settings, WordBuildingGame } from "#models";
import Manager from "#managers";
import { PermissionFlagsBits } from "discord.js";

export default {
  name: "wordbuilding",
  aliases: ["kelimekur", "wordchannel"],
  description: "Kelime türetme kanalını ayarlar veya sıfırlar",
  usage: ".wordbuilding #channel VEYA .wordbuilding reset",
  category: "fun",

  permissions: {
    authorities: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const sender = new Manager(client, { action: message }).sender;

    if (args[0] && (args[0].toLowerCase() === 'reset' || args[0].toLowerCase() === 'sıfırla')) {
      try {
        const settings = await Settings.findOne({ guildId: message.guild.id });
        
        if (!settings?.wordBuildingChannelId) {
          return sender.reply(
            sender.errorEmbed("❌ Kelime türetme kanalı ayarlanmamış!")
          );
        }

        const game = await WordBuildingGame.findOne({
          guildId: message.guild.id,
          channelId: settings.wordBuildingChannelId
        });

        if (!game || game.totalWords === 0) {
          return sender.reply(
            sender.errorEmbed("❌ Sıfırlanacak kelime yok! Oyun henüz başlamamış.")
          );
        }

        const totalWords = game.totalWords;
        const usedWordsCount = game.usedWords.length;

        await WordBuildingGame.findOneAndDelete({
          guildId: message.guild.id,
          channelId: settings.wordBuildingChannelId
        });

        return sender.reply(
          sender.embed({
            title: "Kelime Türetme Oyunu Sıfırlandı",
            description: 
              `Kelime oyunu başarıyla sıfırlandı!\n\n` +
              `**Temizlenen İstatistikler:**\n` +
              `• Toplam Kelime: ${totalWords}\n` +
              `• Kullanılan Kelime: ${usedWordsCount}\n\n` +
              `Yeni bir oyun başlatmak için <#${settings.wordBuildingChannelId}> kanalına bir kelime yazın!`,
            color: "Green"
          })
        );
      } catch (err) {
        console.error("Word building reset hatası:", err);
        return sender.reply(sender.errorEmbed("❌ Sıfırlama sırasında bir hata oluştu!"));
      }
    }

    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);

    if (!channel) {
      return sender.reply(
        sender.errorEmbed(
          "❌ Lütfen bir kanal etiketleyin veya kanal ID'si girin.\n\n" +
          "**Kullanım:**\n" +
          "`.wordbuilding #kanal` - Kanal ayarla\n" +
          "`.wordbuilding reset` - Kelimeleri sıfırla"
        )
      );
    }

    if (!channel.isTextBased()) {
      return sender.reply(sender.errorEmbed("❌ Lütfen bir metin kanalı seçin!"));
    }

    try {
      await Settings.findOneAndUpdate(
        { guildId: message.guild.id },
        { $set: { wordBuildingChannelId: channel.id } },
        { upsert: true, new: true }
      );

      await sender.reply(
        sender.embed({
          title: "Kelime Türetme Kanalı Ayarlandı",
          description: `${channel} kanalı artık kelime türetme kanalı olarak ayarlandı!\n\n` +
            `📝 **Kurallar:**\n` +
            `• Son harfle başlayan kelime yaz\n` +
            `• Minimum 3 harf\n` +
            `• Geçerli Türkçe kelime (TDK)\n` +
            `• Aynı kelime 2 kez kullanılamaz\n` +
            `• Aynı kişi arka arkaya yazamaz\n\n` +
            `Doğru kelime → Yeşil tik\n` +
            `Yanlış kelime → Kırmızı çarpı + uyarı\n\n`,
          color: "Green"
        })
      );
    } catch (err) {
      console.error("Word building kanal ayarlama hatası:", err);
      return sender.reply(sender.errorEmbed("❌ Kanal ayarlanırken bir hata oluştu!"));
    }
  }
};
