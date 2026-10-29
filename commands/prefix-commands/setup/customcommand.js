import { PermissionFlagsBits, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType } from 'discord.js';
import Manager from '#managers';
import { CustomCommand } from '#models';
import { Button } from '#helpers';

export default {
  name: 'customcommand',
  aliases: ['özelkomut', 'sc'],
  description: 'Özel komutlar oluştur, düzenle veya sil.',
  usage: 'customcommand <add/list/delete/edit> [komut_adı]',
  category: 'setup',

  permissions: {
    authorities: [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.Administrator],
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    const sender = manager.sender;

    if (!message.guild) {
      return sender.reply(sender.errorEmbed('❌ Bu komut sadece sunucularda kullanılabilir.'));
    }

    const subCommand = args[0]?.toLowerCase();

    if (!subCommand) {
      return sender.reply(sender.embed({
        title: 'Özel Komut Sistemi',
        description: 'Sunucunuz için özel komutlar oluşturun!',
        fields: [
          {
            name: 'Ekle',
            value: '`.sc add <komut_adı>` - Yeni özel komut ekle',
            inline: false
          },
          {
            name: 'Düzenle',
            value: '`.sc edit <komut_adı>` - Komutu düzenle',
            inline: false
          },
          {
            name: 'Listele',
            value: '`.sc list` - Tüm özel komutları listele',
            inline: false
          },
          {
            name: 'Sil',
            value: '`.sc delete <komut_adı>` - Özel komutu sil',
            inline: false
          }
        ],
        footer: { text: 'Her komut metin, rol ve embed içerebilir!' },
        color: 0x5865F2
      }));
    }

    if (subCommand === 'add' || subCommand === 'ekle') {
      const commandName = args[1]?.toLowerCase();
      if (!commandName) {
        return sender.reply(sender.errorEmbed('❌ Lütfen bir komut adı belirtin.\n**Kullanım:** `.sc add <komut_adı>`'));
      }

      if (commandName.length < 2 || commandName.length > 32) {
        return sender.reply(sender.errorEmbed('❌ Komut adı 2-32 karakter arasında olmalıdır.'));
      }


      const existing = await CustomCommand.findOne({ guildId: message.guild.id, commandName });
      if (existing) {
        return sender.reply(sender.errorEmbed(`❌ **${commandName}** adında bir komut zaten mevcut.`));
      }

      const newCmd = await CustomCommand.create({
        guildId: message.guild.id,
        commandName,
        actionType: 'multi',
        createdBy: message.author.id,
        multiActions: []
      });

 
      return showEditMenu(message, sender, commandName, newCmd);
    }

  
    if (subCommand === 'edit' || subCommand === 'düzenle') {
      const commandName = args[1]?.toLowerCase();
      if (!commandName) {
        return sender.reply(sender.errorEmbed('❌ Lütfen düzenlenecek komut adını belirtin.\n**Kullanım:** `.sc edit <komut_adı>`'));
      }

      const cmd = await CustomCommand.findOne({ guildId: message.guild.id, commandName });
      if (!cmd) {
        return sender.reply(sender.errorEmbed(`❌ **${commandName}** adında bir komut bulunamadı.`));
      }

      return showEditMenu(message, sender, commandName, cmd);
    }


    if (subCommand === 'list' || subCommand === 'liste') {
      const commands = await CustomCommand.find({ guildId: message.guild.id, enabled: true });

      if (commands.length === 0) {
        return sender.reply(sender.embed({
          title: 'Özel Komutlar',
          description: 'Henüz özel komut oluşturulmamış.\n`.sc add <komut_adı>` ile yeni komut oluşturabilirsiniz.',
          color: 0xFEE75C
        }));
      }

      const commandList = commands.map(cmd => {
        const actions = [];
        if (cmd.responseText) actions.push('📝 Metin');
        if (cmd.roleActions?.length > 0) actions.push('👤 Rol');
        if (cmd.embedData?.description) actions.push('📋 Embed');
        
        const actionText = actions.length > 0 ? actions.join(', ') : 'Boş';
        return `**${cmd.commandName}** - ${actionText} (${cmd.usageCount || 0} kullanım)`;
      }).join('\n');

      return sender.reply(sender.embed({
        title: `Özel Komutlar (${commands.length})`,
        description: commandList,
        footer: { text: 'Düzenlemek için: .sc edit <komut_adı>' },
        color: 0x5865F2
      }));
    }

   
    if (subCommand === 'delete' || subCommand === 'sil') {
      const commandName = args[1]?.toLowerCase();
      if (!commandName) {
        return sender.reply(sender.errorEmbed('❌ Lütfen silinecek komut adını belirtin.\n**Kullanım:** `.sc delete <komut_adı>`'));
      }

      const cmd = await CustomCommand.findOne({ guildId: message.guild.id, commandName });
      if (!cmd) {
        return sender.reply(sender.errorEmbed(`❌ **${commandName}** adında bir komut bulunamadı.`));
      }

      await CustomCommand.deleteOne({ _id: cmd._id });
      return sender.reply(sender.classic(`**${commandName}** komutu başarıyla silindi.`));
    }

    return sender.reply(sender.errorEmbed('❌ Geçersiz alt komut. `.sc` yazarak yardım menüsünü görüntüleyin.'));
  }
};


async function showEditMenu(message, sender, commandName, cmd) {
  const currentText = cmd.responseText || 'Ayarlanmamış';
  const currentRoles = cmd.roleActions?.length || 0;
  const currentEmbed = cmd.embedData?.description ? 'Ayarlanmış' : 'Ayarlanmamış';

  const btn = new Button();
  btn.add('cc_text', 'Metin Ekle/Düzenle', btn.style.Primary);
  btn.add('cc_role', 'Rol Ekle/Çıkar', btn.style.Success);
  btn.add('cc_embed', 'Embed Ekle/Düzenle', btn.style.Primary);
  btn.add('cc_preview', 'Önizle', btn.style.Secondary);
  btn.add('cc_done', 'Tamam', btn.style.Success);

  const embed = sender.embed({
    title: `Komut Düzenleme: ${commandName}`,
    description: 'Bu komut çalıştığında ne yapacak? Aşağıdan seçenekleri ekleyin:',
    fields: [
      { name: 'Metin', value: currentText.length > 100 ? currentText.substring(0, 100) + '...' : currentText, inline: false },
      { name: 'Rol İşlemleri', value: `${currentRoles} rol işlemi`, inline: true },
      { name: 'Embed', value: currentEmbed, inline: true }
    ],
    footer: { text: 'Düzenlemek istediğiniz öğeyi seçin' },
    color: 0x5865F2
  });

  const msg = await message.channel.send({
    embeds: [embed],
    components: [btn.build()]
  });

  const collector = msg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 300000 
  });

  collector.on('collect', async (interaction) => {
    if (interaction.customId === 'cc_done') {
      await interaction.update({
        embeds: [sender.embed({
          title: 'Komut Kaydedildi',
          description: `**${commandName}** komutu başarıyla kaydedildi!\n\nArtık \`.${commandName}\` yazarak kullanabilirsiniz.`,
          color: 0x57F287
        })],
        components: []
      });
      return collector.stop();
    }

    if (interaction.customId === 'cc_preview') {
      const previewEmbed = sender.embed({
        title: `Önizleme: ${commandName}`,
        description: 'Komut şu şekilde çalışacak:',
        fields: [],
        color: 0x5865F2
      });

      if (cmd.responseText) {
        previewEmbed.fields.push({ name: '📝 Gönderilecek Metin', value: cmd.responseText, inline: false });
      }

      if (cmd.roleActions && cmd.roleActions.length > 0) {
        const roleList = cmd.roleActions.map(r => {
          const role = message.guild.roles.cache.get(r.roleId);
          const actionText = r.action === 'add' ? 'eklenecek' : r.action === 'remove' ? 'çıkarılacak' : 'toggle';
          return `${role ? role.name : 'Bilinmeyen Rol'} (${actionText})`;
        }).join('\n');
        previewEmbed.fields.push({ name: '👤 Rol İşlemleri', value: roleList, inline: false });
      }

      if (cmd.embedData?.description) {
        previewEmbed.fields.push({ name: '📋 Embed Mesajı', value: 'Embed gönderilecek', inline: false });
      }

      if (previewEmbed.fields.length === 0) {
        previewEmbed.description = 'Henüz hiçbir şey ayarlanmamış.';
      }

      await interaction.reply({ embeds: [previewEmbed], ephemeral: true });
      return;
    }

    if (interaction.customId === 'cc_text') {
      const modal = new ModalBuilder()
        .setCustomId(`cc_text_modal_${Date.now()}`)
        .setTitle('Metin Mesajı');

      const textInput = new TextInputBuilder()
        .setCustomId('text_content')
        .setLabel('Mesaj İçeriği')
        .setPlaceholder('Komut çalıştığında gönderilecek mesaj...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000);

      if (cmd.responseText) {
        textInput.setValue(cmd.responseText);
      }

      modal.addComponents(new ActionRowBuilder().addComponents(textInput));

      await interaction.showModal(modal);

      try {
        const submitted = await interaction.awaitModalSubmit({
          time: 120000,
          filter: (m) => m.user.id === interaction.user.id && m.customId.startsWith('cc_text_modal_')
        });

        const text = submitted.fields.getTextInputValue('text_content');

        await CustomCommand.updateOne(
          { _id: cmd._id },
          { $set: { responseText: text, actionType: 'multi' } }
        );

        cmd.responseText = text;

        await submitted.reply({ content: 'Metin başarıyla ayarlandı!', ephemeral: true });

        await msg.edit({
          embeds: [sender.embed({
            title: `⚙️ Komut Düzenleme: ${commandName}`,
            description: 'Bu komut çalıştığında ne yapacak? Aşağıdan seçenekleri ekleyin:',
            fields: [
              { name: 'Metin', value: text.length > 100 ? text.substring(0, 100) + '...' : text, inline: false },
              { name: 'Rol İşlemleri', value: `${cmd.roleActions?.length || 0} rol işlemi`, inline: true },
              { name: 'Embed', value: cmd.embedData?.description ? 'Ayarlanmış' : 'Ayarlanmamış', inline: true }
            ],
            footer: { text: 'Düzenlemek istediğiniz öğeyi seçin' },
            color: 0x5865F2
          })]
        });

      } catch (err) {
       
      }

      return;
    }

    if (interaction.customId === 'cc_role') {
      
      const roleBtn = new Button();
      roleBtn.add('cc_role_add', 'Rol Ekle', roleBtn.style.Success, '➕');
      roleBtn.add('cc_role_remove', 'Rol Çıkar', roleBtn.style.Danger, '➖');
      roleBtn.add('cc_role_toggle', 'Rol Toggle', roleBtn.style.Primary, '🔄');
      roleBtn.add('cc_role_list', 'Rol Listesi', roleBtn.style.Secondary, '📋');
      roleBtn.add('cc_role_back', 'Geri', roleBtn.style.Secondary, '◀️');

      await interaction.update({
        embeds: [sender.embed({
          title: 'Rol İşlemi Seç',
          description: 'Komut çalıştığında ne yapılacak?',
          fields: [
            { name: '➕ Rol Ekle', value: 'Kullanıcıya belirtilen rolü ekler', inline: false },
            { name: '➖ Rol Çıkar', value: 'Kullanıcıdan belirtilen rolü çıkarır', inline: false },
            { name: '🔄 Rol Toggle', value: 'Kullanıcıda rol varsa çıkarır, yoksa ekler', inline: false }
          ],
          color: 0x5865F2
        })],
        components: [roleBtn.build()]
      });

      const roleCollector = msg.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id && i.customId.startsWith('cc_role_'),
        time: 120000
      });

      roleCollector.on('collect', async (roleInteraction) => {
        if (roleInteraction.customId === 'cc_role_back') {
          roleCollector.stop();
          await roleInteraction.update({
            embeds: [embed],
            components: [btn.build()]
          });
          return;
        }

        if (roleInteraction.customId === 'cc_role_list') {
          
          const roles = cmd.roleActions || [];
          if (roles.length === 0) {
            await roleInteraction.reply({ content: '📋 Henüz rol eklenmemiş.', ephemeral: true });
            return;
          }

          const roleList = roles.map((r, idx) => {
            const role = message.guild.roles.cache.get(r.roleId);
            const actionText = r.action === 'add' ? 'Ekle' : r.action === 'remove' ? 'Çıkar' : 'Toggle';
            return `${idx + 1}. ${role ? role.name : 'Silinmiş Rol'} - ${actionText}`;
          }).join('\n');

          await roleInteraction.reply({ 
            embeds: [sender.embed({
              title: 'Rol Listesi',
              description: roleList,
              color: 0x5865F2
            })], 
            ephemeral: true 
          });
          return;
        }

        let action = '';
        if (roleInteraction.customId === 'cc_role_add') action = 'add';
        if (roleInteraction.customId === 'cc_role_remove') action = 'remove';
        if (roleInteraction.customId === 'cc_role_toggle') action = 'toggle';

        await roleInteraction.reply({ 
          content: `${action === 'add' ? '➕' : action === 'remove' ? '➖' : '🔄'} Lütfen bir rol etiketle veya rol ID'si gir (60 saniye içinde)...`, 
          ephemeral: true 
        });

        const filter = m => m.author.id === message.author.id;
        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);

        if (!collected || collected.size === 0) {
          await roleInteraction.followUp({ content: '⏱️ Süre doldu.', ephemeral: true });
          return;
        }

        const userMsg = collected.first();
        const roleId = userMsg.mentions.roles.first()?.id || userMsg.content.trim();
        const role = message.guild.roles.cache.get(roleId);

        if (!role) {
          await roleInteraction.followUp({ content: '❌ Geçerli bir rol bulunamadı.', ephemeral: true });
          await userMsg.delete().catch(() => {});
          return;
        }

        
        const newRoleActions = cmd.roleActions || [];
        newRoleActions.push({ roleId: role.id, action });

        await CustomCommand.updateOne(
          { _id: cmd._id },
          { $set: { roleActions: newRoleActions, actionType: 'multi' } }
        );

        cmd.roleActions = newRoleActions;

        await roleInteraction.followUp({ 
          content: `${role.name} rolü (${action === 'add' ? 'Ekle' : action === 'remove' ? 'Çıkar' : 'Toggle'}) işlemi eklendi!`, 
          ephemeral: true 
        });

        await userMsg.delete().catch(() => {});

        
        await msg.edit({
          embeds: [sender.embed({
            title: `Komut Düzenleme: ${commandName}`,
            description: 'Bu komut çalıştığında ne yapacak? Aşağıdan seçenekleri ekleyin:',
            fields: [
              { name: 'Metin', value: cmd.responseText || 'Ayarlanmamış', inline: false },
              { name: 'Rol İşlemleri', value: `${newRoleActions.length} rol işlemi`, inline: true },
              { name: 'Embed', value: cmd.embedData?.description ? 'Ayarlanmış' : 'Ayarlanmamış', inline: true }
            ],
            footer: { text: 'Düzenlemek istediğiniz öğeyi seçin' },
            color: 0x5865F2
          })],
          components: [btn.build()]
        });

        roleCollector.stop();
      });

      return;
    }

    if (interaction.customId === 'cc_embed') {
     
      const modal = new ModalBuilder()
        .setCustomId(`cc_embed_modal_${Date.now()}`)
        .setTitle('Embed Mesajı');

      const titleInput = new TextInputBuilder()
        .setCustomId('embed_title')
        .setLabel('Embed Başlığı')
        .setPlaceholder('Başlık...')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(256);

      const descInput = new TextInputBuilder()
        .setCustomId('embed_description')
        .setLabel('Embed Açıklaması')
        .setPlaceholder('Açıklama...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(4000);

      const colorInput = new TextInputBuilder()
        .setCustomId('embed_color')
        .setLabel('Embed Rengi (HEX - örn: #5865F2)')
        .setPlaceholder('#5865F2')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(7);

      if (cmd.embedData) {
        if (cmd.embedData.title) titleInput.setValue(cmd.embedData.title);
        if (cmd.embedData.description) descInput.setValue(cmd.embedData.description);
        if (cmd.embedData.color) colorInput.setValue(cmd.embedData.color);
      }

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descInput),
        new ActionRowBuilder().addComponents(colorInput)
      );

      await interaction.showModal(modal);

      try {
        const submitted = await interaction.awaitModalSubmit({
          time: 120000,
          filter: (m) => m.user.id === interaction.user.id && m.customId.startsWith('cc_embed_modal_')
        });

        const title = submitted.fields.getTextInputValue('embed_title') || undefined;
        const description = submitted.fields.getTextInputValue('embed_description');
        const color = submitted.fields.getTextInputValue('embed_color') || '#5865F2';

        const embedData = {
          title,
          description,
          color
        };

        await CustomCommand.updateOne(
          { _id: cmd._id },
          { $set: { embedData, actionType: 'multi' } }
        );

        cmd.embedData = embedData;

        await submitted.reply({ content: 'Embed başarıyla ayarlandı!', ephemeral: true });

        await msg.edit({
          embeds: [sender.embed({
            title: `Komut Düzenleme: ${commandName}`,
            description: 'Bu komut çalıştığında ne yapacak? Aşağıdan seçenekleri ekleyin:',
            fields: [
              { name: 'Metin', value: cmd.responseText || 'Ayarlanmamış', inline: false },
              { name: 'Rol İşlemleri', value: `${cmd.roleActions?.length || 0} rol işlemi`, inline: true },
              { name: 'Embed', value: 'Ayarlanmış', inline: true }
            ],
            footer: { text: 'Düzenlemek istediğiniz öğeyi seçin' },
            color: 0x5865F2
          })]
        });

      } catch (err) {
      }

      return;
    }
  });

  collector.on('end', (_, reason) => {
    if (reason !== 'user') {
      msg.edit({ components: [] }).catch(() => {});
    }
  });
}
