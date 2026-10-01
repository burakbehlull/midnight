import { ComponentType, PermissionFlagsBits } from 'discord.js';
import { Settings, Staff } from "#models";
import Manager from '#managers';
import { Button } from '#helpers';

const FORMAT_LABEL = {
  'isim_yas': 'İsim Yaş',
  'tag_isim_yas': 'Tag İsim Yaş',
  'isim': 'İsim',
  'tag_isim': 'Tag İsim'
};

const FORMAT_NEEDS_AGE = {
  'isim_yas': true,
  'tag_isim_yas': true,
  'isim': false,
  'tag_isim': false
};

function buildNickname(format, isim, yas, tag) {
  switch (format) {
    case 'isim_yas':
      return `${isim} | ${yas}`;
    case 'tag_isim_yas':
      return `${tag} ${isim} I ${yas}`;
    case 'isim':
      return `${isim}`;
    case 'tag_isim':
      return tag ? `${tag} ${isim}` : `${isim}`;
    default:
      return `${isim} | ${yas}`;
  }
}

export default {
  name: 'kayit',
  aliases: ["register", "kayıt", "k"],
  description: "Kullanıcıya kayıt rolü verir.",
  usage: ".k @user isim | yaş  (veya format sadece isim ise: .k @user isim)",
  category: 'register',

  permissions: {
    authorities: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Administrator],
  },


  async execute(client, message, args) {

    const sender = new Manager(client, { action: message }).sender;

    const member = message.mentions.members.first();
    const settings = await Settings.findOne({ guildId: message.guild.id });

    if (!settings?.erkekRoleId || !settings?.kizRoleId)
      return sender.reply(sender.errorEmbed("❌ Kayıt rolleri ayarlanmamış. `/settings roles erkek` ve `/settings roles kiz` komutlarını kullan."));

    const format = settings?.registerFormat;
    if (!format) {
      return sender.reply(sender.errorEmbed(
        "⚠️ **Kayıt formatı ayarlanmamış!**\n\n" +
        "Yönetici aşağıdaki formatlardan birini seçmeli:\n" +
        "`/settings registerformat` komutu ile seçim yapın.\n\n" +
        "Mevcut format seçenekleri:\n" +
        "• **İsim Yaş** → `.k @user Ahmet 18`\n" +
        "• **Tag İsim Yaş** → `.k @user Ahmet 18` (tag otomatik eklenir)\n" +
        "• **İsim** → `.k @user Ahmet`\n" +
        "• **Tag İsim** → `.k @user Ahmet` (tag otomatik eklenir)"
      ));
    }

    const needsAge = FORMAT_NEEDS_AGE[format] ?? true;
    const tag = settings?.tag || null;

    let kullanımUyarı;
    if (needsAge) {
      kullanımUyarı = "❌ Kullanım: `.k @kullanıcı İsim Yaş`";
    } else {
      kullanımUyarı = "❌ Kullanım: `.k @kullanıcı İsim`";
    }

    if (!member) return sender.reply(sender.errorEmbed(kullanımUyarı));

    let isim;
    let yas = null;

    if (needsAge) {
      if (!args[1] || !args[2]) return sender.reply(sender.errorEmbed(kullanımUyarı));
      isim = args[1];
      const yasNum = parseInt(args[2], 10);
      if (isNaN(yasNum) || yasNum < 1 || yasNum > 120) {
        return sender.reply(sender.errorEmbed("❌ Lütfen geçerli bir yaş girin (1-120)."));
      }
      yas = yasNum;
    } else {
      if (!args[1]) return sender.reply(sender.errorEmbed(kullanımUyarı));
      isim = args[1];
    }

    if ((format === 'tag_isim' || format === 'tag_isim_yas') && !tag) {
      return sender.reply(sender.errorEmbed(
        `**${FORMAT_LABEL[format]}** formatı seçilmiş ama sunucuda **tag ayarlanmamış!**\n` +
        `Önce yönetici tarafından \`/settings tag\` ile tag ayarlanmalıdır.`
      ));
    }

    const yeniNick = buildNickname(format, isim, yas, tag);

    if (yeniNick.length > 32) {
      return sender.reply(sender.errorEmbed(
        `❌ Oluşan isim 32 karakterden uzun olamaz (${yeniNick.length}/32).\n` +
        `Denendi: \`${yeniNick}\`\n` +
        `Lütfen daha kısa bir isim kullanın.`
      ));
    }

    try {
      await member.setNickname(yeniNick);
    } catch (err) {
      return sender.reply(sender.errorEmbed(
        "❌ Kullanıcının ismini değiştirirken hata oluştu.\n" +
        "Botun yetkisi yetersiz olabilir veya kullanıcı sunucu sahibi."
      ));
    }

    await Staff.findOneAndUpdate(
      { userId: message.author.id, guildId: message.guild.id },
      { $inc: { registerCount: 1 } },
      { upsert: true, new: true }
    );

    const btn = new Button();
    btn.add("erkek_btn", "Erkek", btn.style.Primary);
    btn.add("kadin_btn", "Kadın", btn.style.Danger);
    const row = btn.build();

    const msg = await message.channel.send({
      embeds: [
        sender.embed({
          title: "Kayıt",
          description:
            `${member} için cinsiyet seçin:\n\n` +
            `**Format:** ${FORMAT_LABEL[format]}\n` +
            `**Yeni İsim:** \`${yeniNick}\``,
          color: "Blurple"
        })
      ],
      components: [row]
    });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id)
        return i.reply({ embeds: [sender.errorEmbed("❌ Bu buton sana ait değil.")], ephemeral: true });

      if (i.customId === "erkek_btn") {
        await member.roles.add(settings.erkekRoleId);
        await i.update({
          embeds: [sender.classic(
            `Kayıt tamamlandı!\n\n` +
            `**Kullanıcı:** ${member}\n` +
            `**İsim:** \`${yeniNick}\`\n` +
            `**Rol:** <@&${settings.erkekRoleId}>`
          )],
          components: []
        });
      } else if (i.customId === "kadin_btn") {
        await member.roles.add(settings.kizRoleId);
        await i.update({
          embeds: [sender.classic(
            `Kayıt tamamlandı!\n\n` +
            `**Kullanıcı:** ${member}\n` +
            `**İsim:** \`${yeniNick}\`\n` +
            `**Rol:** <@&${settings.kizRoleId}>`
          )],
          components: []
        });
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "messageDelete") return;
      try {
        const m = await msg.fetch().catch(() => null);
        if (m && m.components && m.components.length > 0) {
          await msg.edit({
            embeds: [sender.embed({
              title: "⏰ Süre Doldu",
              description: "60 saniye içinde cinsiyet seçilmediği için işlem kapatıldı. İsim değiştirildi ama rol verilmedi.",
              color: "Yellow"
            })],
            components: []
          }).catch(() => {});
        }
      } catch {}
    });
  }
}
