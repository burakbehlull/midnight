import { ComponentType, PermissionFlagsBits } from 'discord.js';
import { Settings } from "#models";
import Manager from '#managers';
import { Button } from '#helpers';

const MODE_STEP1_SINGLE = 'sr_step1_single';
const MODE_STEP1_DUAL = 'sr_step1_dual';
const MODE_STEP1_CANCEL = 'sr_step1_cancel';

export default {
  name: 'kayıt-sistemi-kur',
  aliases: ['kayit-sistemi-kur', 'kayitsistemikur', 'kayıtsistemikur', 'selfregisterkur', 'self-register-setup'],
  description: "Self-serve (kullanıcı kendi kendine kayıt) sistemini kurar. Tek buton veya Kız/Erkek 2 butonlu seçenek.",
  usage: ".kayıt-sistemi-kur (sadece komutu yaz, yönergeleri izle)",
  category: 'setup',

  permissions: {
    authorities: [PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const sender = manager.sender;

    if (!message.guild) {
      return sender.reply(sender.errorEmbed("❌ Bu komut sadece sunucularda kullanılabilir."));
    }

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return sender.reply(sender.errorEmbed("❌ Bu komut için Yönetici yetkisi gerekir."));
    }

    let settings = await Settings.findOne({ guildId: message.guild.id });
    if (!settings) {
      settings = await Settings.create({ guildId: message.guild.id });
    }

    const btnMode = new Button();
    btnMode.add(MODE_STEP1_SINGLE, "1 Buton (Sadece Kayıt Ol)", btnMode.style.Primary);
    btnMode.add(MODE_STEP1_DUAL, "2 Buton (Kız / Erkek)", btnMode.style.Success);
    btnMode.add(MODE_STEP1_CANCEL, "İptal", btnMode.style.Danger);

    const modeMsg = await message.channel.send({
      embeds: [sender.embed({
        title: "Kayıt Sistemi Kurulumu (Adım 1/2)",
        description:
          "Lütfen kayıt sistemi tipini seçin:\n\n" +
          "**1 Buton:** Tek bir Kayıt Ol butonu olur, herkes aynı rolü alır.\n" +
          "**2 Buton:** Kız ve Erkek olmak üzere 2 ayrı buton, kullanıcı seçimine göre rol verir.",
        color: "Blurple"
      })],
      components: [btnMode.build()]
    });

    try {
      const step1I = await modeMsg.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === message.author.id,
        time: 120_000
      });

      await step1I.deferUpdate().catch(() => {});

      if (step1I.customId === MODE_STEP1_CANCEL) {
        await modeMsg.edit({
          embeds: [sender.embed({ title: "❌ İşlem iptal edildi.", color: "Red" })],
          components: []
        }).catch(() => {});
        return;
      }

      const isDual = step1I.customId === MODE_STEP1_DUAL;
      const mode = isDual ? 'dual' : 'single';


      const usageText = isDual
        ? "Lütfen **erkek rolünü** ve **kız rolünü** bu mesaja cevap olarak etiketleyin:\n`@ErkekRol @KızRol`\n\nveya ID'leriyle: `12345 67890`"
        : "Lütfen **kayıt rolünü** bu mesaja cevap olarak etiketleyin:\n`@KayıtRol`\n\nveya ID'yle: `12345`";

      await modeMsg.edit({
        embeds: [sender.embed({
          title: `Kayıt Sistemi Kurulumu (Adım 2/2)${isDual ? " - 2 Buton" : " - 1 Buton"}`,
          description: usageText + "\n\n`iptal` yazarak çıkabilirsiniz.",
          color: "Blurple"
        })],
        components: []
      }).catch(() => {});

      const collected = await message.channel.awaitMessages({
        filter: (m) => m.author.id === message.author.id,
        max: 1,
        time: 180_000
      });

      const roleMsg = collected.first();
      if (!roleMsg) {
        return modeMsg.edit({
          embeds: [sender.embed({ title: "⏰ Süre doldu, işlem iptal edildi.", color: "Yellow" })],
          components: []
        }).catch(() => {});
      }

      if (roleMsg.content.toLowerCase() === 'iptal') {
        roleMsg.delete().catch(() => {});
        return modeMsg.edit({
          embeds: [sender.embed({ title: "❌ İşlem iptal edildi.", color: "Red" })],
          components: []
        }).catch(() => {});
      }

      let roleSingleId = null;
      let roleErkekId = null;
      let roleKizId = null;

      if (isDual) {
        const mentions = roleMsg.mentions.roles;
        if (mentions.size >= 2) {
          const arr = [...mentions.values()];
          roleErkekId = arr[0].id;
          roleKizId = arr[1].id;
        } else {
          const parts = roleMsg.content.trim().split(/\s+/);
          if (parts.length >= 2) {
            const r1 = await message.guild.roles.fetch(parts[0]).catch(() => null);
            const r2 = await message.guild.roles.fetch(parts[1]).catch(() => null);
            if (r1 && r2) {
              roleErkekId = r1.id;
              roleKizId = r2.id;
            }
          }
        }

        if (!roleErkekId || !roleKizId) {
          roleMsg.delete().catch(() => {});
          return modeMsg.edit({
            embeds: [sender.errorEmbed(
              "❌ 2 geçerli rol bulamadım. 2 buton modunda **önce erkek, sonra kız** rolü olmak üzere 2 rol etiketleyin:\n" +
              "`@Erkek @Kız` veya `erkekID kızID`"
            )],
            components: []
          }).catch(() => {});
        }
      } else {
        const mentions = roleMsg.mentions.roles;
        if (mentions.size >= 1) {
          roleSingleId = [...mentions.values()][0].id;
        } else {
          const parts = roleMsg.content.trim().split(/\s+/);
          if (parts.length >= 1) {
            const r = await message.guild.roles.fetch(parts[0]).catch(() => null);
            if (r) roleSingleId = r.id;
          }
        }

        if (!roleSingleId) {
          roleMsg.delete().catch(() => {});
          return modeMsg.edit({
            embeds: [sender.errorEmbed(
              "❌ 1 geçerli rol bulamadım. Tek buton modunda kayıt rolünü etiketleyin:\n" +
              "`@KayıtRol` veya `rolID`"
            )],
            components: []
          }).catch(() => {});
        }
      }

      roleMsg.delete().catch(() => {});

      const customTextPrompt =
        "Lütfen kayıt mesajında görünecek özel metni yazın.\n" +
        "**Özel bir metin istemiyorsanız** `boş`, `varsayılan`, `default`, `hayır` yazın ya da direkt `boşluk` (varsayılan metin kullanılsın).";

      await modeMsg.edit({
        embeds: [sender.embed({
          title: `Kayıt Sistemi Kurulumu (Adım 3/3)${isDual ? " - 2 Buton" : " - 1 Buton"}`,
          description: customTextPrompt + "\n\n`iptal` yazarak çıkabilirsiniz.",
          color: "Blurple"
        })],
        components: []
      }).catch(() => {});

      const collectedText = await message.channel.awaitMessages({
        filter: (m) => m.author.id === message.author.id,
        max: 1,
        time: 300_000
      });

      const textMsg = collectedText.first();
      let customText = null;
      let usedCustomText = false;

      if (textMsg) {
        const raw = textMsg.content.trim();
        if (raw.toLowerCase() === 'iptal') {
          textMsg.delete().catch(() => {});
          return modeMsg.edit({
            embeds: [sender.embed({ title: "İşlem iptal edildi.", color: "Red" })],
            components: []
          }).catch(() => {});
        }
        const defaults = ['boş', 'varsayılan', 'default', 'hayır', 'hayır.', 'boş.', '', 'skip', 'pass'];
        if (!defaults.includes(raw.toLowerCase())) {
          customText = raw;
          usedCustomText = true;
        }
        textMsg.delete().catch(() => {});
      }

      const DEFAULT_DUAL =
        `Sunucumuza hoş geldin!\n\n` +
        `Aşağıdaki butonlardan birine basarak kayıt olabilirsin.`;

      const DEFAULT_SINGLE =
        `Sunucumuza hoş geldin!\n\n` +
        `Aşağıdaki **Kayıt Ol** butonuna basarak kayıt olabilirsin.`;


      if (settings.selfRegisterChannelId && settings.selfRegisterMessageId) {
        try {
          const oldCh = await message.guild.channels.fetch(settings.selfRegisterChannelId).catch(() => null);
          if (oldCh?.isTextBased()) {
            const oldMsg = await oldCh.messages.fetch(settings.selfRegisterMessageId).catch(() => null);
            if (oldMsg) await oldMsg.delete().catch(() => {});
          }
        } catch {}
      }

      const setupBtn = new Button();
      let setupDesc = '';
      const userPartDual =
        `**Erkek Butonu:** <@&${roleErkekId}>\n` +
        `**Kız Butonu:** <@&${roleKizId}>`;
      const userPartSingle = `**Kayıt Rolü:** <@&${roleSingleId}>`;

      if (isDual) {
        setupBtn.add('sr_erkek', `Erkek`, setupBtn.style.Primary);
        setupBtn.add('sr_kiz', `Kız`, setupBtn.style.Danger);
        const body = customText ? customText : DEFAULT_DUAL;
        setupDesc = `${body}`;
      } else {
        setupBtn.add('sr_single', `Kayıt Ol`, setupBtn.style.Success);
        const body = customText ? customText : DEFAULT_SINGLE;
        setupDesc = `${body}`;
      }

      const setupMsg = await message.channel.send({
        embeds: [sender.embed({
          title: `${message.guild.name}`,
          description: setupDesc,
          color: "Green",
          // thumbnail: message.guild.iconURL(),
          footer: { text: `Kayıt Sistemi`, iconURL: message.guild.iconURL() }
        })],
        components: [setupBtn.build()]
      });

      settings.selfRegisterMode = mode;
      settings.selfRegisterCustomText = customText;
      if (isDual) {
        settings.selfRegisterErkekRoleId = roleErkekId;
        settings.selfRegisterKizRoleId = roleKizId;
        settings.selfRegisterRoleId = null;
      } else {
        settings.selfRegisterRoleId = roleSingleId;
        settings.selfRegisterErkekRoleId = null;
        settings.selfRegisterKizRoleId = null;
      }
      settings.selfRegisterChannelId = message.channel.id;
      settings.selfRegisterMessageId = setupMsg.id;
      await settings.save();

      const roleSummary = isDual
        ? `**Erkek Rolü:** <@&${roleErkekId}>\n**Kız Rolü:** <@&${roleKizId}>`
        : `**Kayıt Rolü:** <@&${roleSingleId}>`;

      const customTextNote = usedCustomText
        ? `**Metin:** Özel metin kullanılıyor ✍️\n\`\`\`${customText}\`\`\`\n`
        : `**Metin:** Varsayılan hoş geldin mesajı kullanılıyor\n`;

      await modeMsg.edit({
        embeds: [sender.embed({
          title: "Kayıt Sistemi Kuruldu!",
          description:
            `**Mod:** ${isDual ? '2 Buton (Kız / Erkek)' : '1 Buton (Kayıt Ol)'}\n` +
            `${roleSummary}\n` +
            `${customTextNote}\n` +
            `Setup mesajı <#${message.channel.id}> kanalına gönderildi.\n` +
            `(Eski setup mesajı varsa otomatik silindi.)\n\n` +
            `Tekrar kurmak için aynı komutu tekrar çalıştırman yeterli.`,
          color: "Green"
        })],
        components: []
      }).catch(() => {});

    } catch (err) {
      const isTimeout = String(err).includes('time') || String(err).includes('awaitMessages');
      await modeMsg.edit({
        embeds: [sender.errorEmbed(
          isTimeout
            ? "3 dakika içinde cevap vermediğin için işlem iptal edildi."
            : `Kurulum sırasında hata: \`${err?.message || String(err).slice(0, 150)}\``
        )],
        components: []
      }).catch(() => {});
    }
  }
};
