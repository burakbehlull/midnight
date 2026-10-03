import { ComponentType, PermissionFlagsBits } from 'discord.js';
import { Settings, Staff } from "#models";
import Manager from '#managers';
import { Button } from '#helpers';

const FORMAT_LABEL = {
  'none': 'Hiçbiri (İsim değiştirme)',
  'isim_yas': 'İsim Yaş',
  'tag_isim_yas': 'Tag İsim Yaş',
  'isim': 'İsim',
  'tag_isim': 'Tag İsim'
};

const FORMAT_NEEDS_AGE = {
  'none': false,
  'isim_yas': true,
  'tag_isim_yas': true,
  'isim': false,
  'tag_isim': false
};

const FORMAT_NEEDS_NAME = {
  'none': false,
  'isim_yas': true,
  'tag_isim_yas': true,
  'isim': true,
  'tag_isim': true
};

function buildNickname(format, isim, yas, tag, currentName) {
  switch (format) {
    case 'none':
      return currentName;
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
  usage: ".k @user (format Hiçbiri ise) veya .k @user isim | yaş",
  category: 'register',

  permissions: {
    authorities: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Administrator],
  },


  async execute(client, message, args) {

    const sender = new Manager(client, { action: message }).sender;

    const member = message.mentions.members.first();
    const settings = await Settings.findOne({ guildId: message.guild.id });

    const mode = settings?.registerMode || 'gender';

    if (mode === 'gender') {
      if (!settings?.erkekRoleId || !settings?.kizRoleId)
        return sender.reply(sender.errorEmbed(
          "❌ Cinsiyet Rolleri modu için kayıt rolleri ayarlanmamış.\n" +
          "`/settings roles erkek` ve `/settings roles kiz` komutlarını kullan."
        ));
    } else if (mode === 'single') {
      if (!settings?.singleRegisterRoleId)
        return sender.reply(sender.errorEmbed(
          "❌ Tek Rol modu için kayıt rolü ayarlanmamış.\n" +
          "`/settings roles singleregister` komutunu kullan."
        ));
    }

    const format = settings?.registerFormat;
    if (!format) {
      return sender.reply(sender.errorEmbed(
        "**Kayıt formatı ayarlanmamış!**\n\n" +
        "Yönetici aşağıdaki formatlardan birini seçmeli:\n" +
        "`/settings registerformat` komutu ile seçim yapın.\n\n" +
        "Mevcut format seçenekleri:\n" +
        "• **Hiçbiri** → `.k @user` (İsim değiştirme, sadece rol)\n" +
        "• **İsim Yaş** → `.k @user Ahmet 18`\n" +
        "• **Tag İsim Yaş** → `.k @user Ahmet 18` (tag otomatik eklenir)\n" +
        "• **İsim** → `.k @user Ahmet`\n" +
        "• **Tag İsim** → `.k @user Ahmet` (tag otomatik eklenir)"
      ));
    }

    const needsAge = FORMAT_NEEDS_AGE[format] ?? true;
    const needsName = FORMAT_NEEDS_NAME[format] ?? true;
    const tag = settings?.tag || null;
    const currentName = member?.nickname || message?.mentions?.members?.first()?.user?.globalName || message?.mentions?.members?.first()?.user?.username || '';

    let kullanımUyarı;
    if (format === 'none') {
      kullanımUyarı = "❌ Kullanım: `.k @kullanıcı`";
    } else if (needsAge) {
      kullanımUyarı = "❌ Kullanım: `.k @kullanıcı İsim Yaş`";
    } else {
      kullanımUyarı = "❌ Kullanım: `.k @kullanıcı İsim`";
    }

    if (!member) return sender.reply(sender.errorEmbed(kullanımUyarı));

    let isim;
    let yas = null;

    if (format === 'none') {
      isim = null;
      yas = null;
    } else if (needsAge) {
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

    if (format !== 'none' && (format === 'tag_isim' || format === 'tag_isim_yas') && !tag) {
      return sender.reply(sender.errorEmbed(
        `**${FORMAT_LABEL[format]}** formatı seçilmiş ama sunucuda **tag ayarlanmamış!**\n` +
        `Önce yönetici tarafından \`/settings tag\` ile tag ayarlanmalıdır.`
      ));
    }

    const yeniNick = buildNickname(format, isim, yas, tag, currentName);

    if (format !== 'none' && yeniNick.length > 32) {
      return sender.reply(sender.errorEmbed(
        `❌ Oluşan isim 32 karakterden uzun olamaz (${yeniNick.length}/32).\n` +
        `Denendi: \`${yeniNick}\`\n` +
        `Lütfen daha kısa bir isim kullanın.`
      ));
    }

    if (format !== 'none') {
      try {
        await member.setNickname(yeniNick);
      } catch (err) {
        return sender.reply(sender.errorEmbed(
          "❌ Kullanıcının ismini değiştirirken hata oluştu.\n" +
          "Botun yetkisi yetersiz olabilir veya kullanıcı sunucu sahibi."
        ));
      }
    }

    await Staff.findOneAndUpdate(
      { userId: message.author.id, guildId: message.guild.id },
      { $inc: { registerCount: 1 } },
      { upsert: true, new: true }
    );

    if (settings?.kayitsizRoleId && member.roles.cache.has(settings.kayitsizRoleId)) {
      await member.roles.remove(settings.kayitsizRoleId).catch(() => {});
    }

    if (mode === 'single') {
      const role = await message.guild.roles.fetch(settings.singleRegisterRoleId).catch(() => null);

      if (role && member.roles.cache.has(role.id)) {
        return sender.reply(sender.embed({
          title: "Kayıt Zaten Yapılmış",
          description:
            `${member} kullanıcısı zaten **${role.name}** rolüne sahip.\n\n` +
            `**İsim:** ${format === 'none' ? '`Değiştirilmedi`' : `\`${yeniNick}\``}\n` +
            `**Rol:** <@&${role.id}>`,
          color: "Yellow"
        }));
      }

      const btn = new Button();
      btn.add("single_confirm_btn", `Kaydet`, btn.style.Success);
      btn.add("single_cancel_btn", "İptal", btn.style.Danger);
      const row = btn.build();

      const isimGosterim = format === 'none' ? '`Değiştirilmeyecek`' : `\`${yeniNick}\``;

      const msg = await message.channel.send({
        embeds: [
          sender.embed({
            title: "Kayıt Onayı",
            description:
              `${member} için onaylayın:\n\n` +
              `**Yeni İsim:** ${isimGosterim}\n` +
              `**Rol:** ${role ? `<@&${role.id}>` : settings.singleRegisterRoleId}`,
            color: "Blurple"
          })
        ],
        components: [row]
      });

      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });

      collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id)
          return i.reply({ embeds: [sender.errorEmbed("❌ Bu buton sana ait değil.")], ephemeral: true });

        if (i.customId === "single_confirm_btn") {
          const givenRole = await message.guild.roles.fetch(settings.singleRegisterRoleId).catch(() => null);
          if (givenRole) await member.roles.add(givenRole.id);
          await i.update({
            embeds: [sender.classic(
              `Kayıt tamamlandı!\n\n` +
              `**Kullanıcı:** ${member}\n` +
              `**İsim:** ${format === 'none' ? '`Değiştirilmedi`' : `\`${yeniNick}\``}\n` +
              `**Rol:** <@&${settings.singleRegisterRoleId}>`
            )],
            components: []
          });
        } else if (i.customId === "single_cancel_btn") {
          if (format !== 'none') {
            try {
              const eski = member.user.globalName || member.user.username;
              await member.setNickname(eski).catch(() => {});
            } catch {}
          }
          await i.update({
            embeds: [sender.embed({
              title: "❌ Kayıt İptal Edildi",
              description: format === 'none'
                ? `İşlem iptal edildi.`
                : `İşlem iptal edildi. (Nickname eski haline döndürüldü.)`,
              color: "Red"
            })],
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
                description: "60 saniye içinde onay verilmediği için işlem kapatıldı.",
                color: "Yellow"
              })],
              components: []
            }).catch(() => {});
          }
        } catch {}
      });
      return;
    }

    if (settings.erkekRoleId && member.roles.cache.has(settings.erkekRoleId)) {
      await member.roles.remove(settings.erkekRoleId).catch(() => {});
    }
    if (settings.kizRoleId && member.roles.cache.has(settings.kizRoleId)) {
      await member.roles.remove(settings.kizRoleId).catch(() => {});
    }

    const btn = new Button();
    btn.add("erkek_btn", "Erkek", btn.style.Primary);
    btn.add("kadin_btn", "Kadın", btn.style.Danger);
    const row = btn.build();

    const isimGosterim = format === 'none' ? '`Değiştirilmeyecek`' : `\`${yeniNick}\``;

    const msg = await message.channel.send({
      embeds: [
        sender.embed({
          title: "Kayıt",
          description:
            `${member} için cinsiyet seçin:\n\n` +
            `**Yeni İsim:** ${isimGosterim}`,
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
            `**İsim:** ${format === 'none' ? '`Değiştirilmedi`' : `\`${yeniNick}\``}\n` +
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
            `**İsim:** ${format === 'none' ? '`Değiştirilmedi`' : `\`${yeniNick}\``}\n` +
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
              description: "60 saniye içinde cinsiyet seçilmediği için işlem kapatıldı.",
              color: "Yellow"
            })],
            components: []
          }).catch(() => {});
        }
      } catch {}
    });
  }
}
