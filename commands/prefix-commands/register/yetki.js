import Manager from "#managers";
import { Settings, Staff } from "#models";
import { PermissionFlagsBits, ComponentType, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";

export default {
  name: "yetki",
  aliases: ["authority", "yetkilendirme"],
  description: "Bir kullanıcıyı yetkili olarak başlatır veya roller verir",
  usage: ".yetki @kullanıcı",
  category: "staff",

  permissions: {
    authorities: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const sender = new Manager(client, { action: message }).sender;

    const target =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]);

    if (!target) {
      return sender.reply(sender.errorEmbed("❌ Lütfen bir kullanıcı etiketleyin."));
    }

    if (target.id === message.author.id) {
      return sender.reply(sender.errorEmbed("❌ Kendinize yetki veremezsiniz."));
    }

    if (target.user.bot) {
      return sender.reply(sender.errorEmbed("❌ Botlara yetki veremezsiniz."));
    }

    const settings = await Settings.findOne({ guildId: message.guild.id });
    if (!settings) {
      return sender.reply(sender.errorEmbed("❌ Sunucu ayarları bulunamadı."));
    }

    const hasStaffRole = settings.staffRole && target.roles.cache.has(settings.staffRole);
    const hasTagRole = settings.tagRoleId && target.roles.cache.has(settings.tagRoleId);
    const existingStaff = await Staff.findOne({ userId: target.id, guildId: message.guild.id });

    const embed = sender.embed({
      title: "Yetkilendirme Paneli",
      description: 
        `**Kullanıcı:** ${target}\n` +
        `**ID:** \`${target.id}\`\n\n` +
        `**Mevcut Durum:**\n` +
        (settings.staffRole ? `• Yetkili Rolü: ${hasStaffRole ? 'Var' : '❌ Yok'} ${hasStaffRole ? `<@&${settings.staffRole}>` : ''}\n` : '• Yetkili Rolü: Ayarlanmamış\n') +
        (settings.tagRoleId ? `• Taglı Üye Rolü: ${hasTagRole ? 'Var' : '❌ Yok'} ${hasTagRole ? `<@&${settings.tagRoleId}>` : ''}\n` : '• Taglı Üye Rolü: Ayarlanmamış\n') +
        `• Veritabanı Kaydı: ${existingStaff ? 'Var' : '❌ Yok'}\n\n` +
        `Aşağıdaki butonlardan birini seçin:`,
      color: "Blurple",
      thumbnail: target.user.displayAvatarURL({ dynamic: true, size: 256 }),
      footer: { text: `İşlem yapan: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() }
    });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("yetki_start_staff")
        .setLabel("Yetkili Başlat")
        .setStyle(hasStaffRole || !settings.staffRole ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(hasStaffRole || !settings.staffRole),
      
      new ButtonBuilder()
        .setCustomId("yetki_remove_staff")
        .setLabel("Staff Rolünü Çek")
        .setStyle(!hasStaffRole || !settings.staffRole ? ButtonStyle.Secondary : ButtonStyle.Danger)
        .setDisabled(!hasStaffRole || !settings.staffRole)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("yetki_add_tag")
        .setLabel("Taglı Üye")
        .setStyle(hasTagRole || !settings.tagRoleId ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(hasTagRole || !settings.tagRoleId),
      
      new ButtonBuilder()
        .setCustomId("yetki_remove_tag")
        .setLabel("Tagsız Üye")
        .setStyle(!hasTagRole || !settings.tagRoleId ? ButtonStyle.Secondary : ButtonStyle.Danger)
        .setDisabled(!hasTagRole || !settings.tagRoleId)
    );

    const msg = await message.channel.send({
      embeds: [embed],
      components: [row1, row2]
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
      filter: (i) => i.user.id === message.author.id
    });

    collector.on("collect", async (interaction) => {
      const customId = interaction.customId;

      if (customId === "yetki_start_staff") {
        if (!settings.staffRole) {
          return interaction.reply({
            content: "❌ Staff rolü ayarlanmamış!",
            ephemeral: true
          });
        }

        if (target.roles.cache.has(settings.staffRole)) {
          return interaction.reply({
            content: "❌ Bu kullanıcıda zaten staff rolü var!",
            ephemeral: true
          });
        }

        try {
          await target.roles.add(settings.staffRole);

          const now = new Date();
          await Staff.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            {
              $inc: { startedStaffCount: 1 },
              $addToSet: { startedUsers: target.id },
              $set: { [`startedAt.${target.id}`]: now }
            },
            { upsert: true, new: true }
          );

          await Staff.findOneAndUpdate(
            { userId: target.id, guildId: message.guild.id },
            { $set: { startedAt: now } },
            { upsert: true, new: true }
          );

          const formattedDate = now.toLocaleDateString("tr-TR", {
            year: "numeric",
            month: "long",
            day: "numeric"
          });

          const staffData = await Staff.findOne({ userId: message.author.id, guildId: message.guild.id });

          await interaction.update({
            embeds: [sender.embed({
              title: "Yetkili Başlatıldı",
              description: 
                `${target} kullanıcısına <@&${settings.staffRole}> rolü verildi!\n\n` +
                `**Tarih:** ${formattedDate}\n` +
                `**Başlatan:** ${message.author}\n` +
                `**Toplam Başlattığınız:** ${staffData?.startedStaffCount || 1}`,
              color: "Green"
            })],
            components: []
          });
          collector.stop();
        } catch (err) {
          console.error(err);
          return interaction.reply({
            content: "❌ Rol verilirken hata oluştu. Bot yetkisini kontrol edin.",
            ephemeral: true
          });
        }
      }

      if (customId === "yetki_remove_staff") {
        if (!settings.staffRole) {
          return interaction.reply({
            content: "❌ Staff rolü ayarlanmamış!",
            ephemeral: true
          });
        }

        if (!target.roles.cache.has(settings.staffRole)) {
          return interaction.reply({
            content: "❌ Bu kullanıcıda staff rolü yok!",
            ephemeral: true
          });
        }

        try {
          await target.roles.remove(settings.staffRole);

          await interaction.update({
            embeds: [sender.embed({
              title: "Staff Rolü Çekildi",
              description: 
                `${target} kullanıcısından <@&${settings.staffRole}> rolü çekildi!\n\n` +
                `**İşlem Yapan:** ${message.author}`,
              color: "Orange"
            })],
            components: []
          });
          collector.stop();
        } catch (err) {
          console.error(err);
          return interaction.reply({
            content: "❌ Rol çekilirken hata oluştu.",
            ephemeral: true
          });
        }
      }

 
      if (customId === "yetki_add_tag") {
        if (!settings.tagRoleId) {
          return interaction.reply({
            content: "❌ Taglı üye rolü ayarlanmamış!",
            ephemeral: true
          });
        }

        if (target.roles.cache.has(settings.tagRoleId)) {
          return interaction.reply({
            content: "❌ Bu kullanıcıda zaten taglı üye rolü var!",
            ephemeral: true
          });
        }

        try {
          await target.roles.add(settings.tagRoleId);

          await Staff.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            {
              $addToSet: { taggedUsers: target.id },
              $inc: { taggedCount: 1 }
            },
            { upsert: true, new: true }
          );

          const staffData = await Staff.findOne({ userId: message.author.id, guildId: message.guild.id });

          await interaction.update({
            embeds: [sender.embed({
              title: "Taglı Üye Rolü Verildi",
              description: 
                `${target} kullanıcısına <@&${settings.tagRoleId}> rolü verildi!\n\n` +
                `**Veren:** ${message.author}\n` +
                `**Toplam Tag Aldırdığınız:** ${staffData?.taggedCount || 1}\n` +
                `Bu kullanıcı sizin taglı üye listelerinize eklendi.`,
              color: "Green"
            })],
            components: []
          });
          collector.stop();
        } catch (err) {
          console.error(err);
          return interaction.reply({
            content: "❌ Rol verilirken hata oluştu.",
            ephemeral: true
          });
        }
      }

      if (customId === "yetki_remove_tag") {
        if (!settings.tagRoleId) {
          return interaction.reply({
            content: "❌ Taglı üye rolü ayarlanmamış!",
            ephemeral: true
          });
        }

        if (!target.roles.cache.has(settings.tagRoleId)) {
          return interaction.reply({
            content: "❌ Bu kullanıcıda taglı üye rolü yok!",
            ephemeral: true
          });
        }

        try {
          await target.roles.remove(settings.tagRoleId);

          await interaction.update({
            embeds: [sender.embed({
              title: "Taglı Üye Rolü Çekildi",
              description: 
                `${target} kullanıcısından <@&${settings.tagRoleId}> rolü çekildi!\n\n` +
                `**İşlem Yapan:** ${message.author}`,
              color: "Orange"
            })],
            components: []
          });
          collector.stop();
        } catch (err) {
          console.error(err);
          return interaction.reply({
            content: "❌ Rol çekilirken hata oluştu.",
            ephemeral: true
          });
        }
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "time") {
        try {
          await msg.edit({
            embeds: [sender.embed({
              title: "Süre Doldu",
              description: "Yetkilendirme işlemi zaman aşımına uğradı.",
              color: "Red"
            })],
            components: []
          });
        } catch {}
      }
    });
  }
};
