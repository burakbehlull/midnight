import Manager from '#managers';
import { CommandSettings } from '#models';
import { PermissionFlagsBits } from 'discord.js';

export default {
  name: 'command',
  aliases: ['cmd', 'komut'],
  description: 'Komutları açıp kapatma ve yönetme sistemi',
  usage: 'command <enable|disable|status|list|reset> <komut_adı>',
  category: 'setup',
  permissions: {
    enabled: false
  },
  
  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return manager.sender.reply(
        manager.sender.errorEmbed('Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın!')
      );
    }

    const action = args[0]?.toLowerCase();
    
    if (!action) {
      return manager.sender.reply(createHelpEmbed(manager));
    }

    switch (action) {
      case 'enable':
      case 'aç':
        return await handleEnable(client, message, args, manager);
      
      case 'disable':
      case 'kapat':
        return await handleDisable(client, message, args, manager);
      
      case 'status':
      case 'durum':
        return await handleStatus(client, message, args, manager);
      
      case 'list':
      case 'liste':
        return await handleList(client, message, args, manager);
      
      case 'reset':
      case 'sıfırla':
        return await handleReset(client, message, args, manager);
      
      default:
        return manager.sender.reply(
          manager.sender.errorEmbed('Geçersiz işlem! `enable`, `disable`, `status`, `list`, `reset` kullanabilirsin.')
        );
    }
  },
};

async function handleEnable(client, message, args, manager) {
  const commandName = args[1]?.toLowerCase();
  
  if (!commandName) {
    return manager.sender.reply(
      manager.sender.errorEmbed('Hangi komutu açmak istediğini belirt!\nÖrnek: `.command enable ban`')
    );
  }

 
  if (!client.prefixCommands.has(commandName) && !client.slashCommands.has(commandName)) {
    return manager.sender.reply(
      manager.sender.errorEmbed(`\`${commandName}\` adında bir komut bulunamadı!`)
    );
  }

  try {
    await CommandSettings.findOneAndUpdate(
      { guildId: message.guild.id, commandName },
      { enabled: true, updatedAt: new Date() },
      { upsert: true }
    );

    const embed = manager.sender.embed({
      title: '✅ Komut Açıldı',
      description: `\`${commandName}\` komutu başarıyla **açıldı**!`,
      color: 0x00FF00,
      footer: { text: `${message.author.username} tarafından` }
    });

    return manager.sender.reply(embed);
  } catch (error) {
    console.error('Command enable error:', error);
    return manager.sender.reply(
      manager.sender.errorEmbed('Komut açılırken bir hata oluştu!')
    );
  }
}


async function handleDisable(client, message, args, manager) {
  const commandName = args[1]?.toLowerCase();
  
  if (!commandName) {
    return manager.sender.reply(
      manager.sender.errorEmbed('Hangi komutu kapatmak istediğini belirt!\nÖrnek: `.command disable ban`')
    );
  }


  if (!client.prefixCommands.has(commandName) && !client.slashCommands.has(commandName)) {
    return manager.sender.reply(
      manager.sender.errorEmbed(`\`${commandName}\` adında bir komut bulunamadı!`)
    );
  }

  // Kritik komutları koruma
  const protectedCommands = ['command', 'cmd', 'komut', 'help', 'yardım'];
  if (protectedCommands.includes(commandName)) {
    return manager.sender.reply(
      manager.sender.errorEmbed(`\`${commandName}\` komutu güvenlik nedeniyle kapatılamaz!`)
    );
  }

  try {
    await CommandSettings.findOneAndUpdate(
      { guildId: message.guild.id, commandName },
      { enabled: false, updatedAt: new Date() },
      { upsert: true }
    );

    const embed = manager.sender.embed({
      title: '🔒 Komut Kapatıldı',
      description: `\`${commandName}\` komutu başarıyla **kapatıldı**!\n\nArtık bu komut hiçbir tepki vermeyecek.`,
      color: 0xFF0000,
      footer: { text: `${message.author.username} tarafından` }
    });

    return manager.sender.reply(embed);
  } catch (error) {
    console.error('Command disable error:', error);
    return manager.sender.reply(
      manager.sender.errorEmbed('Komut kapatılırken bir hata oluştu!')
    );
  }
}


async function handleStatus(client, message, args, manager) {
  const commandName = args[1]?.toLowerCase();
  
  if (!commandName) {
    return manager.sender.reply(
      manager.sender.errorEmbed('Hangi komutun durumunu görmek istediğini belirt!\nÖrnek: `.command status ban`')
    );
  }

  
  if (!client.prefixCommands.has(commandName) && !client.slashCommands.has(commandName)) {
    return manager.sender.reply(
      manager.sender.errorEmbed(`\`${commandName}\` adında bir komut bulunamadı!`)
    );
  }

  try {
    const settings = await CommandSettings.findOne({
      guildId: message.guild.id,
      commandName
    });

    const isEnabled = settings ? settings.enabled : true;
    const statusEmoji = isEnabled ? '✅' : '🔒';
    const statusText = isEnabled ? 'Açık' : 'Kapalı';
    const statusColor = isEnabled ? 0x00FF00 : 0xFF0000;

    const fields = [
      {
        name: 'Durum',
        value: `${statusEmoji} **${statusText}**`,
        inline: true
      }
    ];

    if (settings) {
      if (settings.channelMode !== 'off' && settings.channelMode) {
        let channelInfo = `**Mod:** ${settings.channelMode === 'whitelist' ? 'Sadece izin verilenler' : 'Engellenmiş kanallar'}\n`;
        
        if (settings.channelMode === 'whitelist' && settings.allowedChannels?.length > 0) {
          channelInfo += settings.allowedChannels.map(id => `<#${id}>`).join(', ');
        } else if (settings.channelMode === 'blacklist' && settings.blockedChannels?.length > 0) {
          channelInfo += settings.blockedChannels.map(id => `<#${id}>`).join(', ');
        }
        
        fields.push({ name: '📺 Kanal Kısıtlamaları', value: channelInfo, inline: false });
      }

      if (settings.roleMode !== 'off' && settings.roleMode) {
        let roleInfo = `**Mod:** ${settings.roleMode === 'whitelist' ? 'Sadece izin verilenler' : 'Engellenmiş roller'}\n`;
        
        if (settings.roleMode === 'whitelist' && settings.allowedRoles?.length > 0) {
          roleInfo += settings.allowedRoles.map(id => `<@&${id}>`).join(', ');
        } else if (settings.roleMode === 'blacklist' && settings.blockedRoles?.length > 0) {
          roleInfo += settings.blockedRoles.map(id => `<@&${id}>`).join(', ');
        }
        
        fields.push({ name: '👥 Rol Kısıtlamaları', value: roleInfo, inline: false });
      }

      if (settings.exemptRoles?.length > 0 || settings.exemptUsers?.length > 0) {
        let exemptInfo = '';
        if (settings.exemptRoles?.length > 0) {
          exemptInfo += `**Roller:** ${settings.exemptRoles.map(id => `<@&${id}>`).join(', ')}\n`;
        }
        if (settings.exemptUsers?.length > 0) {
          exemptInfo += `**Üyeler:** ${settings.exemptUsers.map(id => `<@${id}>`).join(', ')}`;
        }
        fields.push({ name: '⭐ Muaflar', value: exemptInfo, inline: false });
      }

      if (settings.autoDelete) {
        fields.push({
          name: '🗑️ Otomatik Silme',
          value: `${settings.deleteAfter} saniye sonra`,
          inline: true
        });
      }

      if (settings.customCooldown) {
        fields.push({
          name: '⏱️ Cooldown',
          value: `${settings.customCooldown} saniye`,
          inline: true
        });
      }
    }

    const embed = manager.sender.embed({
      title: `⚙️ \`${commandName}\` Komut Ayarları`,
      fields,
      color: statusColor,
      footer: { text: `Son güncelleme: ${settings?.updatedAt ? settings.updatedAt.toLocaleString('tr-TR') : 'Hiç güncellenmemiş'}` }
    });

    return manager.sender.reply(embed);
  } catch (error) {
    console.error('Command status error:', error);
    return manager.sender.reply(
      manager.sender.errorEmbed('Komut durumu kontrol edilirken bir hata oluştu!')
    );
  }
}


async function handleList(client, message, args, manager) {
  try {
    const disabledCommands = await CommandSettings.find({
      guildId: message.guild.id,
      enabled: false
    });

    if (disabledCommands.length === 0) {
      const embed = manager.sender.embed({
        title: '📋 Kapalı Komutlar',
        description: '✅ Şu anda hiçbir komut kapalı değil!',
        color: 0x00FF00
      });
      return manager.sender.reply(embed);
    }

    const commandList = disabledCommands
      .map((cmd, index) => `${index + 1}. \`${cmd.commandName}\``)
      .join('\n');

    const embed = manager.sender.embed({
      title: '📋 Kapalı Komutlar',
      description: `Toplam **${disabledCommands.length}** komut kapalı:\n\n${commandList}`,
      color: 0xFF9900,
      footer: { text: 'Bir komutu açmak için: .command enable <komut_adı>' }
    });

    return manager.sender.reply(embed);
  } catch (error) {
    console.error('Command list error:', error);
    return manager.sender.reply(
      manager.sender.errorEmbed('Komutlar listelenirken bir hata oluştu!')
    );
  }
}


async function handleReset(client, message, args, manager) {
  const commandName = args[1]?.toLowerCase();
  
  if (!commandName) {
    return manager.sender.reply(
      manager.sender.errorEmbed('Hangi komutun ayarlarını sıfırlamak istediğini belirt!\nÖrnek: `.command reset ban`')
    );
  }

  try {
    const result = await CommandSettings.findOneAndDelete({
      guildId: message.guild.id,
      commandName
    });

    if (!result) {
      return manager.sender.reply(
        manager.sender.errorEmbed(`\`${commandName}\` komutu için kayıtlı bir ayar bulunamadı!`)
      );
    }

    const embed = manager.sender.embed({
      title: '🔄 Ayarlar Sıfırlandı',
      description: `\`${commandName}\` komutunun tüm ayarları **varsayılana döndürüldü**!`,
      color: 0x0099FF,
      footer: { text: `${message.author.username} tarafından` }
    });

    return manager.sender.reply(embed);
  } catch (error) {
    console.error('Command reset error:', error);
    return manager.sender.reply(
      manager.sender.errorEmbed('Komut sıfırlanırken bir hata oluştu!')
    );
  }
}


function createHelpEmbed(manager) {
  return manager.sender.embed({
    title: '⚙️ Komut Yönetim Sistemi',
    description: 'Sunucudaki komutları açıp kapatabilir, kısıtlamalar ekleyebilirsin.',
    fields: [
      {
        name: '📝 Temel Komutlar',
        value: [
          '`enable <komut>` - Komutu aç',
          '`disable <komut>` - Komutu kapat',
          '`status <komut>` - Komut ayarlarını göster',
          '`list` - Kapalı komutları listele',
          '`reset <komut>` - Ayarları sıfırla'
        ].join('\n'),
        inline: false
      },
      {
        name: '💡 Örnekler',
        value: [
          '`.command disable ban` - Ban komutunu kapat',
          '`.command enable kick` - Kick komutunu aç',
          '`.command status mute` - Mute komutunun durumunu gör',
          '`.command list` - Kapalı komutları listele'
        ].join('\n'),
        inline: false
      },
      {
        name: '⚠️ Önemli',
        value: 'Kapalı komutlar hiçbir tepki vermez. Web panelden daha detaylı ayarlar yapabilirsin.',
        inline: false
      }
    ],
    color: 0x5865F2
  });
}
