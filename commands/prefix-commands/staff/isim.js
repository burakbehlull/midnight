import {
  ComponentType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { Settings, NicknameHistory } from "#models";
import Manager from '#managers';
import { Button } from '#helpers';

async function saveNicknameHistory(userId, guildId, oldNickname, newNickname, changedBy) {
  try {
    await NicknameHistory.create({ userId, guildId, oldNickname, newNickname, changedBy });
  } catch (e) {
    console.error("Nickname history kaydedilemedi:", e);
  }
}

function formatDate(date) {
  try {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}.${month}.${year} ${hours}:${mins}`;
  } catch {
    return String(date);
  }
}

export default {
  name: 'isim',
  aliases: ["nickname", "nick", "ad", "name"],
  description: "Kullanıcının sunucudaki ismini değiştirir.",
  usage: ".isim @user <isim> veya .isim @user",
  category: 'staff',

  permissions: {
    authorities: [PermissionFlagsBits.ManageNicknames, PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const sender = new Manager(client, { action: message }).sender;

    const member = message.mentions.members.first();
    if (!member) return sender.reply(sender.errorEmbed("❌ Lütfen bir kullanıcı etiketleyin.\n**Kullanım:** `.isim @user <isim>` veya `.isim @user`"));

    if (member.id === message.guild.ownerId && message.author.id !== message.guild.ownerId) {
      return sender.reply(sender.errorEmbed("❌ Sunucu sahibinin ismini değiştiremezsin."));
    }

    if (member.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
      return sender.reply(sender.errorEmbed("❌ Bu kullanıcının rolü senin rolünden yüksek veya eşit."));
    }

    const settings = await Settings.findOne({ guildId: message.guild.id });
    const tag = settings?.tag || null;

    const rawNameArgs = args.slice(1).join(" ").trim();

    if (rawNameArgs && rawNameArgs.length > 0) {
      let newNick;
      if (tag) {
        newNick = `${tag} ${rawNameArgs}`;
      } else {
        newNick = rawNameArgs;
      }

      if (newNick.length > 32) {
        return sender.reply(sender.errorEmbed(`❌ İsim 32 karakterden uzun olamaz (${newNick.length}/32).`));
      }

      const oldNick = member.nickname || null;
      try {
        await member.setNickname(newNick);
      } catch (err) {
        return sender.reply(sender.errorEmbed("❌ İsmi değiştirirken bir hata oluştu. Botun yetkisi yetersiz olabilir."));
      }

      await saveNicknameHistory(member.id, message.guild.id, oldNick, newNick, message.author.id);

      return sender.reply(sender.classic(`${member} kullanıcısının ismi başarıyla **${newNick}** olarak değiştirildi.`));
    }

    const btn = new Button();
    btn.add("normal_btn", "Normal", btn.style.Primary, "👤");
    btn.add("age_btn", "İsim Yaş", btn.style.Success, "📅");
    btn.add("history_btn", "Geçmiş", btn.style.Secondary, "📜");
    const row = btn.build();

    const msg = await message.channel.send({
      embeds: [
        sender.embed({
          title: "İsim Değiştir",
          description: `${member} için işlem seçin:`,
          footer: { text: "60 saniye içinde seçim yapmanız gerekiyor." },
          color: "Blurple"
        })
      ],
      components: [row]
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ embeds: [sender.errorEmbed("❌ Bu buton sana ait değil.")], ephemeral: true });
      }

      if (i.customId === "history_btn") {
        const records = await NicknameHistory
          .find({ userId: member.id, guildId: message.guild.id })
          .sort({ changedAt: -1 })
          .limit(30);

        if (!records.length) {
          return i.reply({
            embeds: [
              sender.embed({
                title: `${member.user.tag} - İsim Geçmişi`,
                description: "Bu kullanıcı için henüz bir isim değişikliği kaydı bulunamadı.",
                color: "Yellow"
              })
            ],
            ephemeral: false
          });
        }

        const lines = [];
        let idx = 0;
        for (const rec of records) {
          idx += 1;
          const changer = client.users.cache.get(rec.changedBy);
          const changerTag = changer ? `${changer.tag} (${changer ? changer.id : "Bilinmiyor"})` : `<@${rec.changedBy}> (${changer ? changer.id : "Bilinmiyor"})`;
          const from = rec.oldNickname ? `\`${rec.oldNickname}\`` : "*(orijinal)*";
          const to = rec.newNickname ? `\`${rec.newNickname}\`` : "*(sıfırlandı)*";
          lines.push(
            `**${idx}.** ${formatDate(rec.changedAt)} ┃ ${from} → ${to}\n   ↳ Değiştiren: \`${changerTag}\``
          );
        }

        return i.reply({
          embeds: [
            sender.embed({
              title: `${member.user.tag} - İsim Geçmişi (Son ${records.length})`,
              description: lines.join("\n\n"),
              footer: { text: `Toplam ${records.length} isim değişikliği bulundu.` },
              color: "DarkPurple"
            })
          ],
          ephemeral: false
        });
      }

      if (i.customId === "normal_btn") {
        const modal = new ModalBuilder()
          .setCustomId(`isim_normal_${member.id}_${Date.now()}`)
          .setTitle("İsim Gir");

        const isimInput = new TextInputBuilder()
          .setCustomId("isim")
          .setLabel("İsim")
          .setPlaceholder(tag ? `${tag} Ahmet` : "Ahmet")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(tag ? 32 - (tag.length + 1) : 32);

        const firstActionRow = new ActionRowBuilder().addComponents(isimInput);
        modal.addComponents(firstActionRow);

        await i.showModal(modal);

        try {
          const submitted = await i.awaitModalSubmit({
            time: 60_000,
            filter: (m) => m.user.id === i.user.id && m.customId.startsWith("isim_normal_")
          });

          const isim = submitted.fields.getTextInputValue("isim").trim();

          let newNick;
          if (tag) {
            newNick = `${tag} ${isim}`;
          } else {
            newNick = isim;
          }

          if (newNick.length > 32) {
            await submitted.reply({ embeds: [sender.errorEmbed(`❌ İsim 32 karakterden uzun olamaz (${newNick.length}/32).`)], ephemeral: true });
            return;
          }

          const oldNick = member.nickname || null;
          try {
            await member.setNickname(newNick);
          } catch (err) {
            await submitted.reply({ embeds: [sender.errorEmbed("❌ İsmi değiştirirken bir hata oluştu. Botun yetkisi yetersiz olabilir.")], ephemeral: true });
            return;
          }

          await saveNicknameHistory(member.id, message.guild.id, oldNick, newNick, i.user.id);

          await submitted.reply({
            embeds: [sender.classic(`${member} kullanıcısının ismi başarıyla **${newNick}** olarak değiştirildi.`)],
            ephemeral: false
          });

          await msg.edit({ components: [] });
          collector.stop("modal_handled");

        } catch (err) {
          if (err.code !== "InteractionCollectorError") {
            console.error("Modal submit hatası (normal):", err);
          }
        }

      } else if (i.customId === "age_btn") {
        const modal = new ModalBuilder()
          .setCustomId(`isim_age_${member.id}_${Date.now()}`)
          .setTitle("İsim ve Yaş Gir");

        const isimInput = new TextInputBuilder()
          .setCustomId("isim")
          .setLabel("İsim")
          .setPlaceholder("Burak")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(20);

        const yasInput = new TextInputBuilder()
          .setCustomId("yas")
          .setLabel("Yaş")
          .setPlaceholder("17")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(3);

        const row1 = new ActionRowBuilder().addComponents(isimInput);
        const row2 = new ActionRowBuilder().addComponents(yasInput);
        modal.addComponents(row1, row2);

        await i.showModal(modal);

        try {
          const submitted = await i.awaitModalSubmit({
            time: 60_000,
            filter: (m) => m.user.id === i.user.id && m.customId.startsWith("isim_age_")
          });

          const isim = submitted.fields.getTextInputValue("isim").trim();
          const yasRaw = submitted.fields.getTextInputValue("yas").trim();
          const yas = parseInt(yasRaw, 10);

          if (isNaN(yas) || yas < 1 || yas > 120) {
            await submitted.reply({ embeds: [sender.errorEmbed("❌ Lütfen geçerli bir yaş girin (1-120).")], ephemeral: true });
            return;
          }

          let newNick;
          if (tag) {
            newNick = `${tag} ${isim} I ${yas}`;
          } else {
            newNick = `${isim} I ${yas}`;
          }

          if (newNick.length > 32) {
            await submitted.reply({ embeds: [sender.errorEmbed(`❌ İsim 32 karakterden uzun olamaz (${newNick.length}/32). Daha kısa bir isim deneyin.`)], ephemeral: true });
            return;
          }

          const oldNick = member.nickname || null;
          try {
            await member.setNickname(newNick);
          } catch (err) {
            await submitted.reply({ embeds: [sender.errorEmbed("❌ İsmi değiştirirken bir hata oluştu. Botun yetkisi yetersiz olabilir.")], ephemeral: true });
            return;
          }

          await saveNicknameHistory(member.id, message.guild.id, oldNick, newNick, i.user.id);

          await submitted.reply({
            embeds: [sender.classic(`${member} kullanıcısının ismi başarıyla **${newNick}** olarak değiştirildi.`)],
            ephemeral: false
          });

          await msg.edit({ components: [] });
          collector.stop("modal_handled");

        } catch (err) {
          if (err.code !== "InteractionCollectorError") {
            console.error("Modal submit hatası (age):", err);
          }
        }
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "modal_handled") return;
      try {
        await msg.edit({
          embeds: [sender.embed({
            title: "Süre Doldu",
            description: "⏰ 60 saniye içinde seçim yapılmadığı için işlem iptal edildi.",
            color: "Yellow"
          })],
          components: []
        });
      } catch (e) {}
    });
  }
};
