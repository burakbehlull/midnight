import { CustomCommand } from '#models';


async function executeCustomCommand(message, customCmd) {
  try {
    
    let hasAction = false;
    
    // Placeholder değişkenleri için hedef kullanıcıyı ve rolü belirle
    let targetUser = null;
    let affectedRole = null;
    
    // Rol işlemlerinden hedef kullanıcıyı ve rolü al
    if (customCmd.roleActions && customCmd.roleActions.length > 0) {
      const firstRoleAction = customCmd.roleActions[0];
      
      // Hedef kullanıcıyı belirle
      if (firstRoleAction.target === 'mentioned') {
        targetUser = message.mentions.members.first();
      } else {
        targetUser = message.member;
      }
      
      // Rolü belirle
      const role = message.guild.roles.cache.get(firstRoleAction.roleId);
      if (role) {
        affectedRole = role;
      }
    }

    // Placeholder'ları değiştiren fonksiyon
    const replacePlaceholders = (text) => {
      if (!text) return text;
      
      let result = text;
      
      // $user → Komutu kullanan kişi
      result = result.replace(/\$user/g, `<@${message.author.id}>`);
      
      // $targetUser → Etkilenen/etiketlenen kişi
      if (targetUser) {
        result = result.replace(/\$targetUser/g, `<@${targetUser.id}>`);
      } else {
        result = result.replace(/\$targetUser/g, `<@${message.author.id}>`);
      }
      
      // $role → Verilen/kaldırılan rol
      if (affectedRole) {
        result = result.replace(/\$role/g, affectedRole.name);
      } else {
        result = result.replace(/\$role/g, 'Rol');
      }
      
      return result;
    };

    
    if (customCmd.responseText) {
      const processedText = replacePlaceholders(customCmd.responseText);
      await message.channel.send(processedText);
      hasAction = true;
    }

    
    if (customCmd.embedData && customCmd.embedData.description) {
      const embed = {
        description: replacePlaceholders(customCmd.embedData.description),
        color: customCmd.embedData.color ? parseInt(customCmd.embedData.color.replace('#', ''), 16) : 0x5865F2,
      };

      if (customCmd.embedData.title) {
        embed.title = replacePlaceholders(customCmd.embedData.title);
      }
      if (customCmd.embedData.footer) {
        embed.footer = { text: replacePlaceholders(customCmd.embedData.footer) };
      }
      if (customCmd.embedData.image) {
        embed.image = { url: customCmd.embedData.image };
      }
      if (customCmd.embedData.thumbnail) {
        embed.thumbnail = { url: customCmd.embedData.thumbnail };
      }
      if (customCmd.embedData.fields && customCmd.embedData.fields.length > 0) {
        embed.fields = customCmd.embedData.fields.map(field => ({
          name: replacePlaceholders(field.name),
          value: replacePlaceholders(field.value),
          inline: field.inline
        }));
      }

      await message.channel.send({ embeds: [embed] });
      hasAction = true;
    }

    
    if (customCmd.roleActions && customCmd.roleActions.length > 0) {
      for (const roleAction of customCmd.roleActions) {
        const role = message.guild.roles.cache.get(roleAction.roleId);
        if (!role) continue;

        // Rolü kime vereceğimizi belirle
        let targetMember;
        if (roleAction.target === 'mentioned') {
          // Etiketlenen kişiye ver
          const mentioned = message.mentions.members.first();
          if (!mentioned) {
            await message.reply('❌ Rol vermek için birini etiketlemelisin!').catch(() => {});
            continue;
          }
          targetMember = mentioned;
        } else {
          // Komutu kullanana ver (default: self)
          targetMember = message.member;
        }

        if (!targetMember) continue;

        if (roleAction.action === 'add') {
          if (!targetMember.roles.cache.has(role.id)) {
            await targetMember.roles.add(role).catch(console.error);
          }
        } else if (roleAction.action === 'remove') {
          if (targetMember.roles.cache.has(role.id)) {
            await targetMember.roles.remove(role).catch(console.error);
          }
        } else if (roleAction.action === 'toggle') {
          if (targetMember.roles.cache.has(role.id)) {
            await targetMember.roles.remove(role).catch(console.error);
          } else {
            await targetMember.roles.add(role).catch(console.error);
          }
        }
        hasAction = true;
      }
    }

    
    if (!hasAction) {
      return message.react('❓').catch(() => {});
    }

  } catch (error) {
    console.error('[CustomCommand Execute] Hata:', error);
    return message.react('❌').catch(() => {});
  }
}


async function handleCustomCommand(message, commandName) {
  try {
    const customCmd = await CustomCommand.findOne({ 
      guildId: message.guild.id, 
      commandName: commandName.toLowerCase(),
      enabled: true
    });

    if (!customCmd) {
      return false;
    }

    // Yetkilendirme kontrolü
    let hasPermission = false;

    if (customCmd.permissionMode === 'everyone') {
      hasPermission = true;
    } else if (customCmd.permissionMode === 'roles') {
      // Belirli roller kontrol
      if (customCmd.allowedRoles && customCmd.allowedRoles.length > 0) {
        hasPermission = customCmd.allowedRoles.some(roleId => 
          message.member.roles.cache.has(roleId)
        );
      }
    } else if (customCmd.permissionMode === 'users') {
      // Belirli kullanıcılar kontrol
      if (customCmd.allowedUsers && customCmd.allowedUsers.length > 0) {
        hasPermission = customCmd.allowedUsers.includes(message.author.id);
      }
    }

    // Yetki yoksa sessizce çık
    if (!hasPermission) {
      return true; 
    }

    
    if (customCmd.allowedChannels && customCmd.allowedChannels.length > 0) {
      if (!customCmd.allowedChannels.includes(message.channel.id)) {
        return true;
      }
    }

   
    await CustomCommand.updateOne(
      { _id: customCmd._id },
      { 
        $inc: { usageCount: 1 },
        $set: { lastUsed: new Date() }
      }
    );

   
    await executeCustomCommand(message, customCmd);
    return true;

  } catch (error) {
    console.error('[CustomCommandHandler] Hata:', error);
    return false;
  }
}

export { handleCustomCommand, executeCustomCommand };
