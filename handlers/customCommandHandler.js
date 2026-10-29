import { CustomCommand } from '#models';

/**
 * Özel komutu çalıştırır
 * @param {Message} message - Discord mesaj objesi
 * @param {Object} customCmd - CustomCommand model objesi
 */
async function executeCustomCommand(message, customCmd) {
  try {
    // MULTI veya diğer tipler - tüm özellikleri kontrol et
    let hasAction = false;

    // 1. TEXT - Metin gönder
    if (customCmd.responseText) {
      await message.channel.send(customCmd.responseText);
      hasAction = true;
    }

    // 2. EMBED - Embed gönder
    if (customCmd.embedData && customCmd.embedData.description) {
      const embed = {
        description: customCmd.embedData.description,
        color: customCmd.embedData.color ? parseInt(customCmd.embedData.color.replace('#', ''), 16) : 0x5865F2,
      };

      if (customCmd.embedData.title) {
        embed.title = customCmd.embedData.title;
      }
      if (customCmd.embedData.footer) {
        embed.footer = { text: customCmd.embedData.footer };
      }
      if (customCmd.embedData.image) {
        embed.image = { url: customCmd.embedData.image };
      }
      if (customCmd.embedData.thumbnail) {
        embed.thumbnail = { url: customCmd.embedData.thumbnail };
      }
      if (customCmd.embedData.fields && customCmd.embedData.fields.length > 0) {
        embed.fields = customCmd.embedData.fields;
      }

      await message.channel.send({ embeds: [embed] });
      hasAction = true;
    }

    // 3. ROLE - Rol ver/al
    if (customCmd.roleActions && customCmd.roleActions.length > 0) {
      const member = message.member;
      if (member) {
        for (const roleAction of customCmd.roleActions) {
          const role = message.guild.roles.cache.get(roleAction.roleId);
          if (!role) continue;

          if (roleAction.action === 'add') {
            if (!member.roles.cache.has(role.id)) {
              await member.roles.add(role).catch(console.error);
            }
          } else if (roleAction.action === 'remove') {
            if (member.roles.cache.has(role.id)) {
              await member.roles.remove(role).catch(console.error);
            }
          } else if (roleAction.action === 'toggle') {
            if (member.roles.cache.has(role.id)) {
              await member.roles.remove(role).catch(console.error);
            } else {
              await member.roles.add(role).catch(console.error);
            }
          }
        }
        hasAction = true;
      }
    }

    // Hiçbir aksiyon yoksa reaction ver
    if (!hasAction) {
      return message.react('❓').catch(() => {});
    }

  } catch (error) {
    console.error('[CustomCommand Execute] Hata:', error);
    return message.react('❌').catch(() => {});
  }
}

/**
 * Özel komut kontrolü ve çalıştırması
 * @param {Message} message - Discord mesaj objesi
 * @param {string} commandName - Komut adı
 * @returns {Promise<boolean>} - Komut bulundu ve çalıştırıldı mı?
 */
async function handleCustomCommand(message, commandName) {
  try {
    const customCmd = await CustomCommand.findOne({ 
      guildId: message.guild.id, 
      commandName: commandName.toLowerCase(),
      enabled: true
    });

    if (!customCmd) {
      return false; // Özel komut bulunamadı
    }

    // Yetki kontrolü (eğer ayarlanmışsa)
    if (customCmd.requiredRoles && customCmd.requiredRoles.length > 0) {
      const hasRole = customCmd.requiredRoles.some(roleId => 
        message.member.roles.cache.has(roleId)
      );
      if (!hasRole) {
        return true; // Komut var ama yetki yok, yine de true dön (komut bulundu ama çalıştırılamadı)
      }
    }

    // Kanal kontrolü (eğer ayarlanmışsa)
    if (customCmd.allowedChannels && customCmd.allowedChannels.length > 0) {
      if (!customCmd.allowedChannels.includes(message.channel.id)) {
        return true; // Komut var ama bu kanalda kullanılamaz
      }
    }

    // Kullanım sayısını artır
    await CustomCommand.updateOne(
      { _id: customCmd._id },
      { 
        $inc: { usageCount: 1 },
        $set: { lastUsed: new Date() }
      }
    );

    // Komutu çalıştır
    await executeCustomCommand(message, customCmd);
    return true;

  } catch (error) {
    console.error('[CustomCommandHandler] Hata:', error);
    return false;
  }
}

export { handleCustomCommand, executeCustomCommand };
