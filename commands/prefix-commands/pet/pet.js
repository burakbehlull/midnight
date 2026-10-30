import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } from 'discord.js';
import { createCanvas } from '@napi-rs/canvas';
import { Economy, Shop } from '#models';

const FEED_COST = 100;
const RENAME_COST = 5000;
const FEED_COOLDOWN = 6 * 60 * 60 * 1000; 
const PLAY_COOLDOWN = 6 * 60 * 60 * 1000; 
const LOVE_COOLDOWN = 12 * 60 * 60 * 1000; 

export default {
  name: 'pet',
  aliases: ['pets', 'evcilhayvan'],
  category: 'fun',
  description: 'Evcil hayvan sistemi',
  usage: '.pet [adopt|feed|play|love|sleep|name|accessories|leaderboard]',
  async execute(client, message, args) {
    const subCommand = args[0]?.toLowerCase();

  
    if (!subCommand) {
      return showPetProfile(message);
    }

    switch (subCommand) {
      case 'adopt':
      case 'evlatedin':
        return adoptPet(message);
      case 'feed':
      case 'besle':
        return feedPet(message);
      case 'play':
      case 'oyna':
        return playWithPet(message);
      case 'love':
      case 'sev':
        return lovePet(message);
      case 'sleep':
      case 'uyut':
        return sleepPet(message);
      case 'name':
      case 'isim':
        return renamePet(message, args.slice(1));
      case 'accessories':
      case 'aksesuar':
        return manageAccessories(message, args.slice(1));
      case 'leaderboard':
      case 'lider':
      case 'top':
        return showLeaderboard(message);
      default:
        return message.reply({
          content: [
            '❌ Geçersiz komut!',
            '',
            '**Kullanılabilir komutlar:**',
            '• `.pet` - Hayvan profilini göster',
            '• `.pet adopt` - Hayvan evlat edin',
            '• `.pet feed` - Hayvanı besle',
            '• `.pet play` - Hayvanla oyna',
            '• `.pet love` - Hayvanı sev',
            '• `.pet sleep` - Hayvanı uyut',
            '• `.pet name <isim>` - İsim değiştir',
            '• `.pet accessories` - Aksesuar yönetimi',
            '• `.pet leaderboard` - Lider tablosu'
          ].join('\n'),
          allowedMentions: { repliedUser: false }
        });
    }
  }
};

async function showPetProfile(message) {
  const userEco = await Economy.findOne({ userId: message.author.id });

  if (!userEco || !userEco.pet || !userEco.pet.type) {
    return message.reply({
      content: '❌ Henüz bir evcil hayvanın yok!\n\n**Hayvan edinmek için:**\n1. `.shop` komutuyla marketten **Hayvan Edinme İzni Belgesi** satın al\n2. `.shop` komutuyla bir hayvan satın al (envantere eklenir)\n3. `.pet adopt` komutuyla hayvanı evlat edin',
      allowedMentions: { repliedUser: false }
    });
  }

  const pet = userEco.pet;
  
  const petItem = await Shop.findOne({ slug: pet.slug });
  
  const createBar = (value, max = 100) => {
    const filled = Math.floor((value / max) * 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  };

  const xpNeeded = pet.level * 100;
  const xpProgress = pet.xp;

  const daysSinceAdoption = pet.adoptedAt ? Math.floor((Date.now() - pet.adoptedAt) / (1000 * 60 * 60 * 24)) : 0;

  let accessoryText = 'Yok';
  if (pet.accessories && pet.accessories.length > 0) {
    const accessoryItems = await Shop.find({ slug: { $in: pet.accessories } });
    accessoryText = accessoryItems.map(item => `${item.emoji} ${item.name}`).join(', ');
  }

  const embed = new EmbedBuilder()
    .setTitle(`${petItem?.emoji || '🐾'} ${pet.name} - ${petItem?.name || pet.breed}`)
    .setDescription(`⭐ **Seviye ${pet.level}** (${xpProgress}/${xpNeeded} XP)`)
    .addFields(
      {
        name: 'Durumlar',
        value: [
          `❤️  **Sevgi:**      ${createBar(pet.love)} ${pet.love}%`,
          `🍖  **Açlık:**      ${createBar(pet.hunger)} ${pet.hunger}%`,
          `😊  **Mutluluk:**   ${createBar(pet.happiness)} ${pet.happiness}%`,
          `⚡  **Enerji:**     ${createBar(pet.energy)} ${pet.energy}%`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Bilgiler',
        value: [
          `🎂 **Yaş:** ${daysSinceAdoption} gün`,
          `🏷️ **Tür:** ${petItem?.description || pet.breed}`,
          `👕 **Aksesuarlar:** ${accessoryText}`
        ].join('\n'),
        inline: false
      }
    )
    .setColor('#FF69B4')
    .setFooter({ text: `${message.author.username} için`, iconURL: message.author.displayAvatarURL() })
    .setTimestamp();

  // Butonlar
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('pet_feed')
      .setLabel('Besle')
      .setEmoji('🍖')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('pet_play')
      .setLabel('Oyna')
      .setEmoji('🎾')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('pet_love')
      .setLabel('Sev')
      .setEmoji('❤️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('pet_sleep')
      .setLabel('Uyut')
      .setEmoji('💤')
      .setStyle(ButtonStyle.Secondary)
  );

  await message.reply({
    embeds: [embed],
    components: [row],
    allowedMentions: { repliedUser: false }
  });
}

async function adoptPet(message) {
  const userEco = await Economy.findOne({ userId: message.author.id });

  if (!userEco) {
    return message.reply({
      content: '❌ Ekonomi profilin bulunamadı!',
      allowedMentions: { repliedUser: false }
    });
  }

  if (userEco.pet && userEco.pet.type) {
    return message.reply({
      content: `❌ Zaten bir evcil hayvanın var: **${userEco.pet.name}**\n\nŞu anda sadece 1 hayvan edinme hakkınız var.`,
      allowedMentions: { repliedUser: false }
    });
  }

  const hasPermit = userEco.inventory && userEco.inventory.get('adopt_pet') > 0;
  
  if (!hasPermit) {
    return message.reply({
      content: '❌ **Hayvan Edinme İzni Belgesi**ne sahip değilsin!\n\n`.shop` komutuyla marketten satın alabilirsin.',
      allowedMentions: { repliedUser: false }
    });
  }

  const pets = await Shop.find({ module: 'pet' });
  const ownedPets = pets.filter(pet => {
    const count = userEco.inventory.get(pet.slug);
    return count && count > 0;
  });

  if (ownedPets.length === 0) {
    return message.reply({
      content: '❌ Envanterinde hayvan yok!\n\n`.shop` komutuyla marketten hayvan satın alabilirsin.',
      allowedMentions: { repliedUser: false }
    });
  }

  const options = ownedPets.map(pet => ({
    label: pet.name,
    description: pet.description,
    value: pet.slug,
    emoji: pet.emoji
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('adopt_pet_select')
    .setPlaceholder('Evlat edinmek istediğin hayvanı seç')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setTitle('🐾 Hayvan Evlat Edinme')
    .setDescription('Aşağıdaki menüden evlat edinmek istediğin hayvanı seç.\n\n**Not:** Hayvanına bir isim vermelisin!')
    .setColor('#FFD700')
    .setFooter({ text: `${message.author.username} için`, iconURL: message.author.displayAvatarURL() });

  await message.reply({
    embeds: [embed],
    components: [row],
    allowedMentions: { repliedUser: false }
  });
}


async function feedPet(message) {
  const userEco = await Economy.findOne({ userId: message.author.id });

  if (!userEco || !userEco.pet || !userEco.pet.type) {
    return message.reply({
      content: '❌ Evcil hayvanın yok!',
      allowedMentions: { repliedUser: false }
    });
  }


  const now = Date.now();
  const lastFed = new Date(userEco.pet.lastFed).getTime();
  const timePassed = now - lastFed;

  if (timePassed < FEED_COOLDOWN) {
    const remaining = FEED_COOLDOWN - timePassed;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return message.reply({
      content: `⏰ **${userEco.pet.name}** henüz aç değil!\n\nBir sonraki besleme: **${hours} saat ${minutes} dakika**`,
      allowedMentions: { repliedUser: false }
    });
  }


  if (userEco.money < FEED_COST) {
    return message.reply({
      content: `❌ Mama almak için yeterli paran yok! Gerekli: **${FEED_COST} 💰**`,
      allowedMentions: { repliedUser: false }
    });
  }


  userEco.money -= FEED_COST;
  userEco.pet.hunger = Math.min(100, userEco.pet.hunger + 30);
  userEco.pet.happiness = Math.min(100, userEco.pet.happiness + 10);
  userEco.pet.xp += 5;
  userEco.pet.lastFed = new Date();

 
  let leveledUp = false;
  while (userEco.pet.xp >= userEco.pet.level * 100) {
    userEco.pet.xp -= userEco.pet.level * 100;
    userEco.pet.level++;
    leveledUp = true;
  }

  await userEco.save();

  const embed = new EmbedBuilder()
    .setTitle(`🍖 ${userEco.pet.name} Beslendi!`)
    .setDescription([
      `**${userEco.pet.name}** mama yedi ve mutlu oldu!`,
      '',
      `**Değişiklikler:**`,
      `🍖 Açlık: +30 (${userEco.pet.hunger}/100)`,
      `😊 Mutluluk: +10 (${userEco.pet.happiness}/100)`,
      `⭐ XP: +5`,
      `💰 Para: -${FEED_COST}`
    ].join('\n'))
    .setColor('#4CAF50')
    .setFooter({ text: `Yeni Bakiye: ${userEco.money} 💰` })
    .setTimestamp();

  if (leveledUp) {
    embed.addFields({
      name: '🎉 Seviye Atladı!',
      value: `**${userEco.pet.name}** artık **Seviye ${userEco.pet.level}**!`
    });
  }

  await message.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false }
  });
}


async function playWithPet(message) {
  const userEco = await Economy.findOne({ userId: message.author.id });

  if (!userEco || !userEco.pet || !userEco.pet.type) {
    return message.reply({
      content: '❌ Evcil hayvanın yok!',
      allowedMentions: { repliedUser: false }
    });
  }


  const now = Date.now();
  const lastPlayed = new Date(userEco.pet.lastPlayed).getTime();
  const timePassed = now - lastPlayed;

  if (timePassed < PLAY_COOLDOWN) {
    const remaining = PLAY_COOLDOWN - timePassed;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return message.reply({
      content: `⏰ **${userEco.pet.name}** yorgun! Dinlenmesi gerekiyor.\n\nBir sonraki oyun: **${hours} saat ${minutes} dakika**`,
      allowedMentions: { repliedUser: false }
    });
  }


  if (userEco.pet.energy < 20) {
    return message.reply({
      content: `😴 **${userEco.pet.name}** çok yorgun! Önce uyutman gerekiyor.\n\nKullan: \`.pet sleep\``,
      allowedMentions: { repliedUser: false }
    });
  }

  // Oynama
  userEco.pet.happiness = Math.min(100, userEco.pet.happiness + 20);
  userEco.pet.love = Math.min(100, userEco.pet.love + 15);
  userEco.pet.energy = Math.max(0, userEco.pet.energy - 20);
  userEco.pet.xp += 10;
  userEco.pet.lastPlayed = new Date();


  let leveledUp = false;
  while (userEco.pet.xp >= userEco.pet.level * 100) {
    userEco.pet.xp -= userEco.pet.level * 100;
    userEco.pet.level++;
    leveledUp = true;
  }

  await userEco.save();

  const activities = [
    '🎾 top getirdi',
    '🧶 ipli oyuncakla oynadı',
    '🎯 saklambaç oynadı',
    '🏃 koşturdu',
    '🤸 zıpladı',
    '🎪 takla attı'
  ];
  const activity = activities[Math.floor(Math.random() * activities.length)];

  const embed = new EmbedBuilder()
    .setTitle(`🎮 ${userEco.pet.name} Oyun Oynadı!`)
    .setDescription([
      `**${userEco.pet.name}** ${activity} ve çok eğlendi!`,
      '',
      `**Değişiklikler:**`,
      `😊 Mutluluk: +20 (${userEco.pet.happiness}/100)`,
      `❤️  Sevgi: +15 (${userEco.pet.love}/100)`,
      `⚡ Enerji: -20 (${userEco.pet.energy}/100)`,
      `⭐ XP: +10`
    ].join('\n'))
    .setColor('#2196F3')
    .setTimestamp();

  if (leveledUp) {
    embed.addFields({
      name: 'Seviye Atladı!',
      value: `**${userEco.pet.name}** artık **Seviye ${userEco.pet.level}**!`
    });
  }

  await message.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false }
  });
}

async function lovePet(message) {
  const userEco = await Economy.findOne({ userId: message.author.id });

  if (!userEco || !userEco.pet || !userEco.pet.type) {
    return message.reply({
      content: '❌ Evcil hayvanın yok!',
      allowedMentions: { repliedUser: false }
    });
  }

  const now = Date.now();
  const lastLoved = new Date(userEco.pet.lastLoved).getTime();
  const timePassed = now - lastLoved;

  if (timePassed < LOVE_COOLDOWN) {
    const remaining = LOVE_COOLDOWN - timePassed;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return message.reply({
      content: `**${userEco.pet.name}** henüz yeterince sevgi aldı!\n\nBir sonraki sevme: **${hours} saat ${minutes} dakika**`,
      allowedMentions: { repliedUser: false }
    });
  }


  userEco.pet.love = Math.min(100, userEco.pet.love + 15);
  userEco.pet.happiness = Math.min(100, userEco.pet.happiness + 10);
  userEco.pet.xp += 5;
  userEco.pet.lastLoved = new Date();


  let leveledUp = false;
  while (userEco.pet.xp >= userEco.pet.level * 100) {
    userEco.pet.xp -= userEco.pet.level * 100;
    userEco.pet.level++;
    leveledUp = true;
  }

  await userEco.save();

 
  const loveMessages = [
    'başını okşadın ve mırıldandı',
    'seni sevgiyle baktı',
    'kuyruğunu salladı',
    'sana sarıldı',
    'yüzünü yaladı',
    'sevgiyle miyavladı'
  ];
  const loveMsg = loveMessages[Math.floor(Math.random() * loveMessages.length)];

  const embed = new EmbedBuilder()
    .setTitle(`❤️ ${userEco.pet.name} Sevildi!`)
    .setDescription([
      `**${userEco.pet.name}** ${loveMsg}!`,
      '',
      `**Değişiklikler:**`,
      `❤️  Sevgi: +15 (${userEco.pet.love}/100)`,
      `😊 Mutluluk: +10 (${userEco.pet.happiness}/100)`,
      `XP: +5`
    ].join('\n'))
    .setColor('#FF1493')
    .setTimestamp();

  if (leveledUp) {
    embed.addFields({
      name: 'Seviye Atladı!',
      value: `**${userEco.pet.name}** artık **Seviye ${userEco.pet.level}**!`
    });
  }

  await message.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false }
  });
}


async function sleepPet(message) {
  const userEco = await Economy.findOne({ userId: message.author.id });

  if (!userEco || !userEco.pet || !userEco.pet.type) {
    return message.reply({
      content: '❌ Evcil hayvanın yok!',
      allowedMentions: { repliedUser: false }
    });
  }

  
  if (userEco.pet.energy >= 90) {
    return message.reply({
      content: `⚡ **${userEco.pet.name}** zaten dinç ve enerjik! Uyumasına gerek yok.`,
      allowedMentions: { repliedUser: false }
    });
  }

  const oldEnergy = userEco.pet.energy;
  userEco.pet.energy = 100;
  
  await userEco.save();

  const embed = new EmbedBuilder()
    .setTitle(`💤 ${userEco.pet.name} Uyudu!`)
    .setDescription([
      `**${userEco.pet.name}** rahat bir uyku çekti ve enerjilendi!`,
      '',
      `**Değişiklikler:**`,
      `⚡ Enerji: ${oldEnergy} → 100`
    ].join('\n'))
    .setColor('#9C27B0')
    .setTimestamp();

  await message.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false }
  });
}


async function renamePet(message, args) {
  const userEco = await Economy.findOne({ userId: message.author.id });

  if (!userEco || !userEco.pet || !userEco.pet.type) {
    return message.reply({
      content: '❌ Evcil hayvanın yok!',
      allowedMentions: { repliedUser: false }
    });
  }

  const newName = args.join(' ').trim();

  if (!newName) {
    return message.reply({
      content: '❌ Yeni bir isim belirtmelisin!\n\nKullanım: `.pet name <yeni isim>`',
      allowedMentions: { repliedUser: false }
    });
  }

  if (newName.length < 2 || newName.length > 20) {
    return message.reply({
      content: '❌ İsim 2-20 karakter arasında olmalı!',
      allowedMentions: { repliedUser: false }
    });
  }


  if (userEco.money < RENAME_COST) {
    return message.reply({
      content: `❌ İsim değiştirmek için yeterli paran yok! Gerekli: **${RENAME_COST} 💰**`,
      allowedMentions: { repliedUser: false }
    });
  }

  const oldName = userEco.pet.name;
  userEco.pet.name = newName;
  userEco.money -= RENAME_COST;

  await userEco.save();

  const embed = new EmbedBuilder()
    .setTitle('✏️ İsim Değiştirildi!')
    .setDescription([
      `Evcil hayvanının ismi başarıyla değiştirildi!`,
      '',
      `**Eski İsim:** ${oldName}`,
      `**Yeni İsim:** ${newName}`,
      '',
      `💰 **Ücret:** -${RENAME_COST}`
    ].join('\n'))
    .setColor('#FFD700')
    .setFooter({ text: `Yeni Bakiye: ${userEco.money} 💰` })
    .setTimestamp();

  await message.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false }
  });
}


async function manageAccessories(message, args) {
  const userEco = await Economy.findOne({ userId: message.author.id });

  if (!userEco || !userEco.pet || !userEco.pet.type) {
    return message.reply({
      content: '❌ Evcil hayvanın yok!',
      allowedMentions: { repliedUser: false }
    });
  }

  const subCommand = args[0]?.toLowerCase();

  if (subCommand === 'set') {
    const accessorySlug = args[1];

    if (!accessorySlug) {
      return message.reply({
        content: '❌ Bir aksesuar slug\'ı belirtmelisin!\n\nKullanım: `.pet accessories set <slug>`',
        allowedMentions: { repliedUser: false }
      });
    }

   
    const count = userEco.inventory.get(accessorySlug);
    if (!count || count <= 0) {
      return message.reply({
        content: '❌ Bu aksesuar envanterinde yok!',
        allowedMentions: { repliedUser: false }
      });
    }

  
    const accessory = await Shop.findOne({ slug: accessorySlug, module: 'pet_accessory' });
    if (!accessory) {
      return message.reply({
        content: '❌ Geçersiz aksesuar!',
        allowedMentions: { repliedUser: false }
      });
    }

   
    if (userEco.pet.accessories.includes(accessorySlug)) {
      return message.reply({
        content: `❌ **${accessory.name}** zaten takılı!`,
        allowedMentions: { repliedUser: false }
      });
    }

  
    userEco.pet.accessories.push(accessorySlug);
    await userEco.save();

    const embed = new EmbedBuilder()
      .setTitle('Aksesuar Takıldı!')
      .setDescription(`**${accessory.emoji} ${accessory.name}** başarıyla **${userEco.pet.name}**'e takıldı!`)
      .setColor('#00BCD4')
      .setTimestamp();

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  }

  if (subCommand === 'remove') {
    const accessorySlug = args[1];

    if (!accessorySlug) {
      return message.reply({
        content: '❌ Bir aksesuar slug\'ı belirtmelisin!\n\nKullanım: `.pet accessories remove <slug>`',
        allowedMentions: { repliedUser: false }
      });
    }

   
    if (!userEco.pet.accessories.includes(accessorySlug)) {
      return message.reply({
        content: '❌ Bu aksesuar zaten takılı değil!',
        allowedMentions: { repliedUser: false }
      });
    }

   
    const accessory = await Shop.findOne({ slug: accessorySlug, module: 'pet_accessory' });

  
    userEco.pet.accessories = userEco.pet.accessories.filter(a => a !== accessorySlug);
    await userEco.save();

    const embed = new EmbedBuilder()
      .setTitle('Aksesuar Çıkarıldı!')
      .setDescription(`**${accessory?.emoji || ''} ${accessory?.name || 'Aksesuar'}** **${userEco.pet.name}**'den çıkarıldı!`)
      .setColor('#FF5722')
      .setTimestamp();

    return message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  }


  const accessories = await Shop.find({ module: 'pet_accessory' });
  const ownedAccessories = accessories.filter(acc => {
    const count = userEco.inventory.get(acc.slug);
    return count && count > 0;
  });

  const equippedAccessories = await Shop.find({
    slug: { $in: userEco.pet.accessories }
  });

  const embed = new EmbedBuilder()
    .setTitle(`${userEco.pet.name} - Aksesuarlar`)
    .setColor('#9C27B0');

  if (equippedAccessories.length > 0) {
    embed.addFields({
      name: 'Takılı Aksesuarlar',
      value: equippedAccessories.map(acc => `${acc.emoji} **${acc.name}** (\`${acc.slug}\`)`).join('\n'),
      inline: false
    });
  }

  if (ownedAccessories.length > 0) {
    embed.addFields({
      name: 'Envanterindeki Aksesuarlar',
      value: ownedAccessories.map(acc => {
        const isEquipped = userEco.pet.accessories.includes(acc.slug);
        return `${acc.emoji} **${acc.name}** (\`${acc.slug}\`) ${isEquipped ? '✅' : ''}`;
      }).join('\n'),
      inline: false
    });
  }

  if (ownedAccessories.length === 0 && equippedAccessories.length === 0) {
    embed.setDescription('❌ Hiç aksesuarın yok!\n\n`.shop` komutuyla marketten aksesuar satın alabilirsin.');
  } else {
    embed.setFooter({ text: 'Kullanım: .pet accessories set <slug> | .pet accessories remove <slug>' });
  }

  await message.reply({
    embeds: [embed],
    allowedMentions: { repliedUser: false }
  });
}


async function showLeaderboard(message) {
  await message.channel.sendTyping();

  const topPets = await Economy.find({
    'pet.type': { $ne: null },
    'pet.level': { $exists: true }
  })
    .sort({ 'pet.level': -1, 'pet.xp': -1 })
    .limit(10)
    .lean();

  if (topPets.length === 0) {
    return message.reply({
      content: '❌ Henüz evcil hayvanı olan kimse yok!',
      allowedMentions: { repliedUser: false }
    });
  }


  const userIds = topPets.map(p => p.userId);
  const users = await Promise.all(
    userIds.map(id => message.client.users.fetch(id).catch(() => null))
  );


  const petSlugs = topPets.map(p => p.pet.slug).filter(Boolean);
  const petItems = await Shop.find({ slug: { $in: petSlugs } });
  const petItemMap = new Map(petItems.map(item => [item.slug, item]));


  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

 
  ctx.font = 'bold 42px sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.textAlign = 'center';
  ctx.fillText('🏆 Evcil Hayvan Lider Tablosu', canvas.width / 2, 60);


  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText('En Yüksek Seviyeli Hayvanlar', canvas.width / 2, 95);

  
  let yPos = 150;
  const rowHeight = 42;

  for (let i = 0; i < topPets.length; i++) {
    const pet = topPets[i].pet;
    const user = users[i];
    const petItem = petItemMap.get(pet.slug);


    let rankColor = '#ffffff';
    if (i === 0) rankColor = '#FFD700'; 
    else if (i === 1) rankColor = '#C0C0C0'; 
    else if (i === 2) rankColor = '#CD7F32';
  
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = rankColor;
    ctx.textAlign = 'left';
    ctx.fillText(`#${i + 1}`, 40, yPos);

  
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${petItem?.emoji || '🐾'} ${pet.name}`, 100, yPos);

    
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`(${user?.username || 'Bilinmeyen'})`, 320, yPos);

    
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'right';
    ctx.fillText(`Seviye ${pet.level}`, canvas.width - 40, yPos);

    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, yPos + 15);
    ctx.lineTo(canvas.width - 40, yPos + 15);
    ctx.stroke();

    yPos += rowHeight;
  }

  
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#666';
  ctx.textAlign = 'center';
  ctx.fillText('Hayvanını seviyeye göre sırala - .pet komutuyla hayvanını gör', canvas.width / 2, canvas.height - 20);

  const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), {
    name: 'pet-leaderboard.png'
  });

  await message.reply({
    files: [attachment],
    allowedMentions: { repliedUser: false }
  });
}
