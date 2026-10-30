import Manager from '#managers';
import { Economy, Shop } from '#models';

export default {
  name: 'family',
  description: 'Aile yapını, evlatlarını ve anne-babanı gösterir.',
  aliases: ['aile'],
  usage: '.family [@kullanıcı] | .family name <isim>',
  category: 'social',
  
  permissions: {
    enabled: false
  },

  async execute(client, message, args) {
    const manager = new Manager(client, { action: message });
    
    if (args[0]?.toLowerCase() === 'name' || args[0]?.toLowerCase() === 'isim') {
      const familyName = args.slice(1).join(' ').trim();
      
      if (!familyName) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Bir aile ismi belirtmelisin!\n\nKullanım: `.family name <aile ismi>`'));
      }
      
      if (familyName.length < 2 || familyName.length > 30) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Aile ismi 2-30 karakter arasında olmalı!'));
      }
      
      const userData = await Economy.findOne({ userId: message.author.id }) || new Economy({ userId: message.author.id });
      
      if (!userData.marriedTo) {
        return manager.sender.reply(manager.sender.errorEmbed('❌ Aile ismi belirlemek için evli olmalısın!'));
      }
      
      userData.familyName = familyName;
      await userData.save();
      
    
      const partnerData = await Economy.findOne({ userId: userData.marriedTo });
      if (partnerData) {
        partnerData.familyName = familyName;
        await partnerData.save();
      }
      

      if (userData.fosterlings && userData.fosterlings.length > 0) {
        const children = await Economy.find({ 
          userId: { $in: userData.fosterlings },
          marriedTo: null 
        });
        
        for (const child of children) {
          child.familyName = familyName;
          await child.save();
        }
      }
      
      if (partnerData?.fosterlings && partnerData.fosterlings.length > 0) {
        const partnerChildren = await Economy.find({ 
          userId: { $in: partnerData.fosterlings },
          marriedTo: null
        });
        
        for (const child of partnerChildren) {
          child.familyName = familyName;
          await child.save();
        }
      }
      
      const embed = manager.sender.classic(`Aile isminiz **"${familyName}"** olarak belirlendi!\n\n(Eşinize ve evlenmemiş çocuklarınıza da yansıtıldı)`);
      return manager.sender.reply(embed);
    }
    
  
    const target = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;

    const userData = await Economy.findOne({ userId: target.id }) || new Economy({ userId: target.id });

    const partnerId = userData.marriedTo;
    let partnerData = null;
    if (partnerId) {
      partnerData = await Economy.findOne({ userId: partnerId }).lean();
    }

    let displayFamilyName = null;
    
    if (userData.marriedTo && userData.familyName) {
      displayFamilyName = userData.familyName;
    } else {
      const parentEntry = await Economy.findOne({ fosterlings: target.id }).lean();
      if (parentEntry?.familyName) {
        displayFamilyName = parentEntry.familyName;
      } else if (parentEntry?.marriedTo) {
        const otherParentData = await Economy.findOne({ userId: parentEntry.marriedTo }).lean();
        if (otherParentData?.familyName) {
          displayFamilyName = otherParentData.familyName;
        }
      }
    }

    const allFosterlings = new Set([...(userData.fosterlings || [])]);
    if (partnerData?.fosterlings?.length) partnerData.fosterlings.forEach(id => allFosterlings.add(id));
    const fosterlingsList = allFosterlings.size > 0
      ? [...allFosterlings].map((id, idx) => `${idx + 1}. <@${id}>`).join('\n')
      : '_Yok_';

    let parentsText = '_Yok_';
    const parentEntry = await Economy.findOne({ fosterlings: target.id }).lean();
    if (parentEntry) {
      if (parentEntry.marriedTo) {
        parentsText = `<@${parentEntry.userId}> + <@${parentEntry.marriedTo}>`;
      } else {
        parentsText = `<@${parentEntry.userId}>`;
      }
    }

    const marriageSinceText = (() => {
      if (!userData.marriageSince || !partnerId) return '_Yok_';
      const marriedDate = new Date(userData.marriageSince);
      const diff = Math.abs(Date.now() - marriedDate.getTime());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return `<t:${Math.floor(marriedDate.getTime() / 1000)}:D> (${days} gün)`;
    })();

    let petsText = '_Yok_';
    const allPets = [];
    
    const allPetSlugs = [];
    if (userData.pet?.slug) allPetSlugs.push(userData.pet.slug);
    if (partnerData?.pet?.slug) allPetSlugs.push(partnerData.pet.slug);
    
    if (allFosterlings.size > 0) {
      const fosterlingDataList = await Economy.find({ userId: { $in: [...allFosterlings] } }).lean();
      for (const fd of fosterlingDataList) {
        if (fd.pet?.slug) allPetSlugs.push(fd.pet.slug);
      }
    }
    
    if (parentEntry?.pet?.slug) allPetSlugs.push(parentEntry.pet.slug);
    if (parentEntry?.marriedTo) {
      const otherParentData = await Economy.findOne({ userId: parentEntry.marriedTo }).lean();
      if (otherParentData?.pet?.slug) allPetSlugs.push(otherParentData.pet.slug);
    }
    
    const petItems = await Shop.find({ slug: { $in: allPetSlugs.filter(Boolean) } });
    const petItemMap = new Map(petItems.map(item => [item.slug, item]));
    
    if (userData.pet && userData.pet.type && userData.pet.name) {
      const petItem = petItemMap.get(userData.pet.slug);
      const emoji = petItem?.emoji || ' ';
      const breed = petItem?.name || userData.pet.breed || 'Bilinmeyen';
      allPets.push(`- ${emoji} \`${userData.pet.name}\` : ${breed} (sahip: <@${target.id}>)`);
    }
    
    if (partnerData?.pet?.type && partnerData.pet.name) {
      const petItem = petItemMap.get(partnerData.pet.slug);
      const emoji = petItem?.emoji || ' ';
      const breed = petItem?.name || partnerData.pet.breed || 'Bilinmeyen';
      allPets.push(`- ${emoji} \`${partnerData.pet.name}\` : ${breed} (sahip: <@${partnerId}>)`);
    }
    

    if (allFosterlings.size > 0) {
      const fosterlingDataList = await Economy.find({ userId: { $in: [...allFosterlings] } }).lean();
      for (const fosterlingData of fosterlingDataList) {
        if (fosterlingData.pet?.type && fosterlingData.pet.name) {
          const petItem = petItemMap.get(fosterlingData.pet.slug);
          const emoji = petItem?.emoji || ' ';
          const breed = petItem?.name || fosterlingData.pet.breed || 'Bilinmeyen';
          allPets.push(`- ${emoji} \`${fosterlingData.pet.name}\` : ${breed} (sahip: <@${fosterlingData.userId}>)`);
        }
      }
    }
    

    if (parentEntry?.pet?.type && parentEntry.pet.name) {
      const petItem = petItemMap.get(parentEntry.pet.slug);
      const emoji = petItem?.emoji || ' ';
      const breed = petItem?.name || parentEntry.pet.breed || 'Bilinmeyen';
      allPets.push(`- ${emoji} \`${parentEntry.pet.name}\` : ${breed} (sahip: <@${parentEntry.userId}>)`);
    }
    
    if (parentEntry?.marriedTo) {
      const otherParentData = await Economy.findOne({ userId: parentEntry.marriedTo }).lean();
      if (otherParentData?.pet?.type && otherParentData.pet.name) {
        const petItem = petItemMap.get(otherParentData.pet.slug);
        const emoji = petItem?.emoji || ' ';
        const breed = petItem?.name || otherParentData.pet.breed || 'Bilinmeyen';
        allPets.push(`- ${emoji} \`${otherParentData.pet.name}\` : ${breed} (sahip: <@${parentEntry.marriedTo}>)`);
      }
    }
    
    if (allPets.length > 0) {
      petsText = allPets.join('\n');
    }

    const familyTitle = displayFamilyName 
      ? `\`${displayFamilyName}\`` 
      : `**${target.username}** adlı kullanıcının aile ağacı`;

    const embed = manager.sender.classic(familyTitle);
    embed.addFields(
      { name: '❤️ Eşi', value: partnerId ? `<@${partnerId}>` : '_Yok_', inline: true },
      { name: '💍 Evlenme Tarihi', value: marriageSinceText, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: '👨‍👩‍👧 Evlatları', value: fosterlingsList, inline: false },
      { name: '👨‍👩‍👦 Anne / Babası', value: parentsText, inline: false },
      { name: '🐾 Evcil Hayvanlar', value: petsText, inline: false }
    );
    
    if (target.id === message.author.id && userData.marriedTo && !userData.familyName) {
      embed.setFooter({ text: 'İpucu: .family name <isim> ile ailenize isim verebilirsiniz!' });
    }

    manager.sender.reply(embed);
  }
};
