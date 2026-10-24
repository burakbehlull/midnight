import { EmbedBuilder, SlashCommandBuilder, UserFlags, InteractionContextType, ApplicationIntegrationType } from 'discord.js';

export default {
  name: 'look',
  aliases: ['profile', 'kullanıcı', 'user'],
  description: 'Bir kullanıcının profil bilgilerini gösterir',
  usage: 'look [@kullanıcı/ID/username]',
  category: 'general',
  
  data: new SlashCommandBuilder()
    .setName('look')
    .setDescription('Bir kullanıcının profil bilgilerini gösterir')
    .addStringOption(option =>
      option
        .setName('kullanıcı')
        .setDescription('Kullanıcı ID, username veya mention (@kullanıcı)')
        .setRequired(false)
    )
    .setDMPermission(true)
    .setIntegrationTypes([
      ApplicationIntegrationType.UserInstall
    ])
    .setContexts([
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ]),
    
  

  async execute(client, interaction, options) {
    try {
      if (interaction.isCommand?.()) {
        let targetUser = null;
        const input = interaction.options?.getString('kullanıcı');
        
        if (input) {
          const mentionMatch = input.match(/^<@!?(\d{17,19})>$/);
          if (mentionMatch) {
            const userId = mentionMatch[1];
            try {
              targetUser = await client.users.fetch(userId);
            } catch (error) {
              return interaction.reply({ content: `❌ Mention edilen kullanıcı bulunamadı!`, ephemeral: true });
            }
          }
          else if (/^\d{17,19}$/.test(input)) {
            try {
              targetUser = await client.users.fetch(input);
            } catch (error) {
              return interaction.reply({ content: `❌ ID \`${input}\` ile kullanıcı bulunamadı!`, ephemeral: true });
            }
          }
          else {
            if (interaction.guild) {
              const members = await interaction.guild.members.fetch({ query: input, limit: 1 }).catch(() => null);
              if (members && members.size > 0) {
                targetUser = members.first().user;
              }
              
              if (!targetUser) {
                const allMembers = await interaction.guild.members.fetch().catch(() => null);
                if (allMembers) {
                  const member = allMembers.find(m => 
                    m.user.username.toLowerCase() === input.toLowerCase() ||
                    m.user.tag.toLowerCase() === input.toLowerCase() ||
                    (m.user.globalName && m.user.globalName.toLowerCase() === input.toLowerCase())
                  );
                  targetUser = member?.user;
                }
              }
            }
            
            if (!targetUser) {
              targetUser = client.users.cache.find(u => 
                u.username.toLowerCase() === input.toLowerCase() ||
                u.tag.toLowerCase() === input.toLowerCase() ||
                (u.globalName && u.globalName.toLowerCase() === input.toLowerCase())
              );
            }
            
            if (!targetUser) {
              return interaction.reply({ content: `❌ "${input}" kullanıcısı bulunamadı!`, ephemeral: true });
            }
          }
        } else {
          targetUser = interaction.user;
        }
        
        const fetchedUser = await client.users.fetch(targetUser.id, { force: true });
        
        const embed = await createUserProfileEmbed(fetchedUser, interaction.guild);
        
        await interaction.reply({ embeds: [embed] });
      }
      else {
        const message = interaction;
        let targetUser = null;

        const userInput = options?.kullanıcı || options?._raw?.[0];

        if (userInput) {
          const mentionMatch = userInput.match(/^<@!?(\d{17,19})>$/);
          if (mentionMatch) {
            const userId = mentionMatch[1];
            try {
              targetUser = await client.users.fetch(userId);
            } catch (error) {
              return message.reply(`❌ Mention edilen kullanıcı bulunamadı!`);
            }
          }
          else if (/^\d{17,19}$/.test(userInput)) {
            try {
              targetUser = await client.users.fetch(userInput);
            } catch (error) {
              return message.reply(`❌ ID \`${userInput}\` ile kullanıcı bulunamadı!`);
            }
          }

          else {

            if (message.guild) {
              const members = await message.guild.members.fetch({ query: userInput, limit: 1 }).catch(() => null);
              if (members && members.size > 0) {
                targetUser = members.first().user;
              }
              

              if (!targetUser) {
                const allMembers = await message.guild.members.fetch().catch(() => null);
                if (allMembers) {
                  const member = allMembers.find(m => 
                    m.user.username.toLowerCase() === userInput.toLowerCase() ||
                    m.user.tag.toLowerCase() === userInput.toLowerCase() ||
                    (m.user.globalName && m.user.globalName.toLowerCase() === userInput.toLowerCase()) ||
                    (m.nickname && m.nickname.toLowerCase() === userInput.toLowerCase())
                  );
                  targetUser = member?.user;
                }
              }
            }
            
  
            if (!targetUser) {
              targetUser = client.users.cache.find(u => 
                u.username.toLowerCase() === userInput.toLowerCase() ||
                u.tag.toLowerCase() === userInput.toLowerCase() ||
                (u.globalName && u.globalName.toLowerCase() === userInput.toLowerCase())
              );
            }
            
            if (!targetUser) {
              return message.reply(`❌ "${userInput}" kullanıcısı bulunamadı!`);
            }
          }
        }
        

        if (!targetUser) {
          targetUser = message.author;
        }


        if (!targetUser || !targetUser.id) {
          console.error('❌ targetUser hala null:', { userInput, hasAuthor: !!message.author });
          return message.reply('❌ Kullanıcı belirlenemedi!');
        }


        const fetchedUser = await client.users.fetch(targetUser.id, { force: true });
        

        const embed = await createUserProfileEmbed(fetchedUser, message.guild);
        
        await message.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      console.error('Look command error:', error);
      
      if (interaction.isCommand?.()) {
        const errorMessage = interaction.replied || interaction.deferred 
          ? { content: '❌ Kullanıcı bilgileri alınamadı!', ephemeral: true }
          : { content: '❌ Bir hata oluştu!', ephemeral: true };
        
        await interaction.reply(errorMessage).catch(() => {});
      } else {
        interaction.reply?.('❌ Kullanıcı bilgileri alınamadı!').catch(() => {});
      }
    }
  },

  async run(client, message, args) {

    try {
      let targetUser;


      if (args.length > 0) {
        const input = args[0];
        

        const mention = message.mentions.users.first();
        if (mention) {
          targetUser = mention;
        }
        
        else if (/^\d{17,19}$/.test(input)) {
          targetUser = await client.users.fetch(input).catch(() => null);
        }
  
        else {
       
          if (message.guild) {
            const members = await message.guild.members.fetch();
            const member = members.find(m => 
              m.user.username.toLowerCase() === input.toLowerCase() ||
              m.user.tag.toLowerCase() === input.toLowerCase() ||
              (m.user.globalName && m.user.globalName.toLowerCase() === input.toLowerCase())
            );
            targetUser = member?.user;
          }
          
          
          if (!targetUser) {
            targetUser = client.users.cache.find(u => 
              u.username.toLowerCase() === input.toLowerCase() ||
              u.tag.toLowerCase() === input.toLowerCase() ||
              (u.globalName && u.globalName.toLowerCase() === input.toLowerCase())
            );
          }
        }

        if (!targetUser) {
          return message.reply('❌ Kullanıcı bulunamadı!');
        }
      } else {
        targetUser = message.author;
      }

    
      const fetchedUser = await client.users.fetch(targetUser.id, { force: true });
      
     
      const embed = await createUserProfileEmbed(fetchedUser, message.guild);
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Look command error:', error);
      message.reply('❌ Kullanıcı bilgileri alınamadı!');
    }
  }
};


async function createUserProfileEmbed(user, guild) {
  const embed = new EmbedBuilder()
    .setTitle(`👤 ${user.globalName || user.username}`)
    .setColor(user.accentColor || user.hexAccentColor || '#5865F2');


  const avatar = user.displayAvatarURL({ size: 256, extension: 'png' });
  embed.setThumbnail(avatar);


  const banner = user.bannerURL({ size: 1024, extension: 'png' });
  if (banner) {
    embed.setImage(banner);
  }

  let userInfo = '';
  
  if (user.globalName) {
    userInfo += `**Global Name:** ${user.globalName}\n`;
  }
  userInfo += `**Username:** ${user.username}\n`;
  userInfo += `**User ID:** \`${user.id}\`\n`;
  
  
  const createdTimestamp = Math.floor(user.createdTimestamp / 1000);
  userInfo += `**Hesap Oluşturulma:** <t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)\n`;


  if (user.bot) {
    userInfo += `**Bot:** ✅\n`;
    if (user.flags?.has(UserFlags.VerifiedBot)) {
      userInfo += `**Doğrulanmış Bot:** ✅\n`;
    }
  }

  embed.addFields({ name: '📋 Bilgiler', value: userInfo });

  
  const badges = getUserBadges(user);
  if (badges.length > 0) {
    embed.addFields({ 
      name: '🏅 Rozetler', 
      value: badges.join(' ')
    });
  }

 
  if (user.accentColor || user.hexAccentColor) {
    const colorHex = user.hexAccentColor || `#${user.accentColor.toString(16).padStart(6, '0')}`;
    embed.addFields({ 
      name: '🎨 Profil Rengi', 
      value: `\`${colorHex}\``
    });
  }

 
  if (guild) {
    try {
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (member) {
        let guildInfo = '';
        
   
        if (member.joinedTimestamp) {
          const joinedTimestamp = Math.floor(member.joinedTimestamp / 1000);
          guildInfo += `**Katılma Tarihi:** <t:${joinedTimestamp}:F> (<t:${joinedTimestamp}:R>)\n`;
        }

    
        if (member.nickname) {
          guildInfo += `**Nickname:** ${member.nickname}\n`;
        }

       
        const roles = member.roles.cache
          .filter(role => role.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .map(role => role.toString())
          .slice(0, 10); 

        if (roles.length > 0) {
          guildInfo += `**Roller (${member.roles.cache.size - 1}):** ${roles.join(', ')}`;
          if (member.roles.cache.size - 1 > 10) {
            guildInfo += ` ve ${member.roles.cache.size - 11} tane daha...`;
          }
        }

        if (guildInfo) {
          embed.addFields({ 
            name: `🏰 ${guild.name}`, 
            value: guildInfo 
          });
        }

     
        if (member.premiumSince) {
          const boostTimestamp = Math.floor(member.premiumSinceTimestamp / 1000);
          embed.addFields({
            name: '💎 Nitro Boost',
            value: `<t:${boostTimestamp}:R> boost yapıyor!`
          });
        }

       
        if (member.communicationDisabledUntil) {
          const timeoutTimestamp = Math.floor(member.communicationDisabledUntil.getTime() / 1000);
          embed.addFields({
            name: '🔇 Zaman Aşımı',
            value: `<t:${timeoutTimestamp}:R> kadar susturulmuş`
          });
        }
      }
    } catch (error) {
      console.log('Guild member bilgisi alınamadı:', error.message);
    }
  }

  
  const links = [];
  links.push(`[Avatar](${avatar})`);
  if (banner) {
    links.push(`[Banner](${banner})`);
  }
  
 
  if (guild) {
    try {
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (member?.avatarURL()) {
        const guildAvatar = member.avatarURL({ size: 256, extension: 'png' });
        links.push(`[Sunucu Avatar](${guildAvatar})`);
      }
    } catch (e) {}
  }

  embed.addFields({ 
    name: '🔗 Linkler', 
    value: links.join(' • ') 
  });

 
  embed.setFooter({ 
    text: `${user.bot ? '🤖 Bot' : '👤 Kullanıcı'}`,
    iconURL: avatar
  });

  embed.setTimestamp();

  return embed;
}


function getUserBadges(user) {
  const badges = [];
  
  if (!user.flags) return badges;

  const flagMap = {
    [UserFlags.Staff]: '<:staff:1234567890> Discord Çalışanı',
    [UserFlags.Partner]: '<:partner:1234567890> Partnered Server Sahibi',
    [UserFlags.Hypesquad]: '<:hypesquad:1234567890> HypeSquad Events',
    [UserFlags.BugHunterLevel1]: '<:bughunter1:1234567890> Bug Hunter Level 1',
    [UserFlags.HypeSquadOnlineHouse1]: '<:bravery:1234567890> HypeSquad Bravery',
    [UserFlags.HypeSquadOnlineHouse2]: '<:brilliance:1234567890> HypeSquad Brilliance',
    [UserFlags.HypeSquadOnlineHouse3]: '<:balance:1234567890> HypeSquad Balance',
    [UserFlags.PremiumEarlySupporter]: '<:earlysupporter:1234567890> Early Supporter',
    [UserFlags.BugHunterLevel2]: '<:bughunter2:1234567890> Bug Hunter Level 2',
    [UserFlags.VerifiedBot]: '✅ Doğrulanmış Bot',
    [UserFlags.VerifiedDeveloper]: '<:developer:1234567890> Erken Doğrulanmış Bot Geliştiricisi',
    [UserFlags.CertifiedModerator]: '<:moderator:1234567890> Discord Sertifikalı Moderatör',
    [UserFlags.ActiveDeveloper]: '<:activedev:1234567890> Aktif Geliştirici'
  };

 
  const simpleFlagMap = {
    [UserFlags.Staff]: '🛡️ Discord Çalışanı',
    [UserFlags.Partner]: '🤝 Partner',
    [UserFlags.Hypesquad]: '🎉 HypeSquad',
    [UserFlags.BugHunterLevel1]: '🐛 Bug Hunter',
    [UserFlags.HypeSquadOnlineHouse1]: '💪 Bravery',
    [UserFlags.HypeSquadOnlineHouse2]: '💎 Brilliance',
    [UserFlags.HypeSquadOnlineHouse3]: '⚖️ Balance',
    [UserFlags.PremiumEarlySupporter]: '⭐ Early Supporter',
    [UserFlags.BugHunterLevel2]: '🐛🐛 Bug Hunter 2',
    [UserFlags.VerifiedBot]: '✅ Doğrulanmış Bot',
    [UserFlags.VerifiedDeveloper]: '👨‍💻 Erken Geliştirici',
    [UserFlags.CertifiedModerator]: '🛡️ Sertifikalı Moderatör',
    [UserFlags.ActiveDeveloper]: '💻 Aktif Geliştirici'
  };

  for (const [flag, badge] of Object.entries(simpleFlagMap)) {
    if (user.flags.has(flag)) {
      badges.push(badge);
    }
  }

  return badges;
}
