import { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { Economy, Shop } from '#models';

export async function petInteractionHandler(interaction) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return false;

  if (interaction.customId === 'pet_feed') {
    await interaction.deferUpdate();
    
    const userEco = await Economy.findOne({ userId: interaction.user.id });
    if (!userEco || !userEco.pet || !userEco.pet.type) {
      return interaction.followUp({
        content: '❌ Evcil hayvanın yok!',
        ephemeral: true
      });
    }

    const FEED_COOLDOWN = 6 * 60 * 60 * 1000;
    const now = Date.now();
    const lastFed = new Date(userEco.pet.lastFed).getTime();
    const timePassed = now - lastFed;

    if (timePassed < FEED_COOLDOWN) {
      const remaining = FEED_COOLDOWN - timePassed;
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      
      return interaction.followUp({
        content: `⏰ **${userEco.pet.name}** henüz aç değil!\n\nBir sonraki besleme: **${hours} saat ${minutes} dakika**`,
        ephemeral: true
      });
    }

    const FEED_COST = 100;
    if (userEco.money < FEED_COST) {
      return interaction.followUp({
        content: `❌ Mama almak için yeterli paran yok! Gerekli: **${FEED_COST}**`,
        ephemeral: true
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
        `XP: +5`,
        `Para: -${FEED_COST}`
      ].join('\n'))
      .setColor('#4CAF50')
      .setFooter({ text: `Yeni Bakiye: ${userEco.money} 💰` })
      .setTimestamp();

    if (leveledUp) {
      embed.addFields({
        name: 'Seviye Atladı!',
        value: `**${userEco.pet.name}** artık **Seviye ${userEco.pet.level}**!`
      });
    }

    await interaction.followUp({ embeds: [embed] });
    return true;
  }

  if (interaction.customId === 'pet_play') {
    await interaction.deferUpdate();
    
    const userEco = await Economy.findOne({ userId: interaction.user.id });
    if (!userEco || !userEco.pet || !userEco.pet.type) {
      return interaction.followUp({
        content: '❌ Evcil hayvanın yok!',
        ephemeral: true
      });
    }

    const PLAY_COOLDOWN = 6 * 60 * 60 * 1000;
    const now = Date.now();
    const lastPlayed = new Date(userEco.pet.lastPlayed).getTime();
    const timePassed = now - lastPlayed;

    if (timePassed < PLAY_COOLDOWN) {
      const remaining = PLAY_COOLDOWN - timePassed;
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      
      return interaction.followUp({
        content: `⏰ **${userEco.pet.name}** yorgun! Dinlenmesi gerekiyor.\n\nBir sonraki oyun: **${hours} saat ${minutes} dakika**`,
        ephemeral: true
      });
    }

    if (userEco.pet.energy < 20) {
      return interaction.followUp({
        content: `**${userEco.pet.name}** çok yorgun! Önce uyutman gerekiyor.`,
        ephemeral: true
      });
    }

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

    const activities = ['🎾 top getirdi', '🧶 ipli oyuncakla oynadı', '🎯 saklambaç oynadı', '🏃 koşturdu'];
    const activity = activities[Math.floor(Math.random() * activities.length)];

    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${userEco.pet.name} Oyun Oynadı!`)
      .setDescription([
        `**${userEco.pet.name}** ${activity} ve çok eğlendi!`,
        '',
        `**Değişiklikler:**`,
        `😊 Mutluluk: +20 (${userEco.pet.happiness}/100)`,
        `❤️ Sevgi: +15 (${userEco.pet.love}/100)`,
        `⚡ Enerji: -20 (${userEco.pet.energy}/100)`,
        `XP: +10`
      ].join('\n'))
      .setColor('#2196F3')
      .setTimestamp();

    if (leveledUp) {
      embed.addFields({
        name: '🎉 Seviye Atladı!',
        value: `**${userEco.pet.name}** artık **Seviye ${userEco.pet.level}**!`
      });
    }

    await interaction.followUp({ embeds: [embed] });
    return true;
  }

  if (interaction.customId === 'pet_love') {
    await interaction.deferUpdate();
    
    const userEco = await Economy.findOne({ userId: interaction.user.id });
    if (!userEco || !userEco.pet || !userEco.pet.type) {
      return interaction.followUp({
        content: '❌ Evcil hayvanın yok!',
        ephemeral: true
      });
    }

    const LOVE_COOLDOWN = 12 * 60 * 60 * 1000;
    const now = Date.now();
    const lastLoved = new Date(userEco.pet.lastLoved).getTime();
    const timePassed = now - lastLoved;

    if (timePassed < LOVE_COOLDOWN) {
      const remaining = LOVE_COOLDOWN - timePassed;
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      
      return interaction.followUp({
        content: `**${userEco.pet.name}** henüz yeterince sevgi aldı!\n\nBir sonraki sevme: **${hours} saat ${minutes} dakika**`,
        ephemeral: true
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

    const loveMessages = ['başını okşadın ve mırıldandı', 'seni sevgiyle baktı', 'kuyruğunu salladı'];
    const loveMsg = loveMessages[Math.floor(Math.random() * loveMessages.length)];

    const embed = new EmbedBuilder()
      .setTitle(`❤️ ${userEco.pet.name} Sevildi!`)
      .setDescription([
        `**${userEco.pet.name}** ${loveMsg}!`,
        '',
        `**Değişiklikler:**`,
        `❤️ Sevgi: +15 (${userEco.pet.love}/100)`,
        `Mutluluk: +10 (${userEco.pet.happiness}/100)`,
        `XP: +5`
      ].join('\n'))
      .setColor('#FF1493')
      .setTimestamp();

    if (leveledUp) {
      embed.addFields({
        name: '🎉 Seviye Atladı!',
        value: `**${userEco.pet.name}** artık **Seviye ${userEco.pet.level}**!`
      });
    }

    await interaction.followUp({ embeds: [embed] });
    return true;
  }

  if (interaction.customId === 'pet_sleep') {
    await interaction.deferUpdate();
    
    const userEco = await Economy.findOne({ userId: interaction.user.id });
    if (!userEco || !userEco.pet || !userEco.pet.type) {
      return interaction.followUp({
        content: '❌ Evcil hayvanın yok!',
        ephemeral: true
      });
    }

    if (userEco.pet.energy >= 90) {
      return interaction.followUp({
        content: `⚡ **${userEco.pet.name}** zaten dinç ve enerjik! Uyumasına gerek yok.`,
        ephemeral: true
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

    await interaction.followUp({ embeds: [embed] });
    return true;
  }


  if (interaction.customId === 'adopt_pet_select') {
    const petSlug = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`adopt_pet_name:${petSlug}`)
      .setTitle('Hayvanına Bir İsim Ver');

    const nameInput = new TextInputBuilder()
      .setCustomId('pet_name')
      .setLabel('Hayvanının İsmi')
      .setStyle(TextInputStyle.Short)
      .setMinLength(2)
      .setMaxLength(20)
      .setPlaceholder('Örn: Buddy, Whiskers, Luna')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(nameInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
    return true;
  }


  if (interaction.customId && interaction.customId.startsWith('adopt_pet_name:')) {
    const petSlug = interaction.customId.split(':')[1];
    const petName = interaction.fields.getTextInputValue('pet_name');

    const userEco = await Economy.findOne({ userId: interaction.user.id });
    if (!userEco) {
      return interaction.reply({
        content: '❌ Ekonomi profilin bulunamadı!',
        ephemeral: true
      });
    }

 
    if (userEco.pet && userEco.pet.type) {
      return interaction.reply({
        content: `❌ Zaten bir evcil hayvanın var: **${userEco.pet.name}**`,
        ephemeral: true
      });
    }


    const petCount = userEco.inventory.get(petSlug);
    if (!petCount || petCount <= 0) {
      return interaction.reply({
        content: '❌ Bu hayvan envanterinde yok!',
        ephemeral: true
      });
    }

    const petItem = await Shop.findOne({ slug: petSlug });
    if (!petItem) {
      return interaction.reply({
        content: '❌ Hayvan bilgileri bulunamadı!',
        ephemeral: true
      });
    }

    userEco.pet = {
      type: petItem.species,
      breed: petItem.name,
      slug: petSlug,
      name: petName,
      level: 1,
      xp: 0,
      love: 50,
      hunger: 50,
      happiness: 50,
      energy: 100,
      adoptedAt: new Date(),
      lastFed: new Date(0),
      lastPlayed: new Date(0),
      lastLoved: new Date(0),
      accessories: []
    };


    userEco.inventory.set(petSlug, petCount - 1);

  
    const permitCount = userEco.inventory.get('adopt_pet');
    userEco.inventory.set('adopt_pet', permitCount - 1);

    await userEco.save();

    const embed = new EmbedBuilder()
      .setTitle('🎊 Tebrikler!')
      .setDescription([
        `**${petName}** artık senin sadık arkadaşın!`,
        '',
        `${petItem.emoji} **${petItem.name}**`,
        `${petItem.description}`,
        '',
        `Hayvanınla etkileşim kurmak için \`.pets\` komutunu kullan!`
      ].join('\n'))
      .setColor('#FFD700')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    return true;
  }

  return false;
}
