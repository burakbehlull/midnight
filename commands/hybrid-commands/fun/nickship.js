import {
  AttachmentBuilder,
  InteractionContextType,
  SlashCommandBuilder
} from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import { hybridReply } from '#helpers';

function cleanNickname(value) {
  return Array.from(String(value || ''))
    .filter(character => /[\p{L}\p{N}\p{M}]/u.test(character))
    .join('');
}

function mixNames(first, second) {
  const firstChars = Array.from(first);
  const secondChars = Array.from(second);
  const firstCut = Math.max(1, Math.ceil(firstChars.length / 2));
  const secondCut = Math.floor(secondChars.length / 2);

  return `${firstChars.slice(0, firstCut).join('')}${secondChars.slice(secondCut).join('')}`;
}

async function resolveMember(guild, option) {
  const userId = option?.id ?? option?.user?.id;
  if (!userId) return null;

  return guild.members.cache.get(userId)
    ?? await guild.members.fetch(userId).catch(() => null);
}

function getNickname(member) {
  return member.displayName
    || member.user.globalName
    || member.user.username
    || 'Midnight';
}

function makeNameVariants(firstNick, secondNick) {
  const first = cleanNickname(firstNick) || 'Midnight';
  const second = cleanNickname(secondNick) || 'Midnight';
  const compact = (value, length) => Array.from(value).slice(0, length).join('');
  const tail = (value, length) => Array.from(value).slice(-length).join('');

  const candidates = [
    { label: 'Ana karışım', value: mixNames(first, second) },
    { label: 'Ters karışım', value: mixNames(second, first) },
    {
      label: 'Kısa imza',
      value: `${Array.from(first)[0]}${Array.from(second)[0]}`
    },
    {
      label: 'Aesthetic',
      value: `${compact(first, 3)}${tail(second, 3)}`
    }
  ];

  const seen = new Set();
  return candidates.filter(({ value }) => {
    const key = value.toLocaleLowerCase('tr-TR');
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default {
  name: 'nickship',
  description: 'İki kişinin nicklerini birleştirip ship isimleri üretir.',
  usage: 'nickship [@kişi1] [@kişi2]',
  aliases: ['nship', 'nickshipper'],
  category: 'fun',
  permissions: { enabled: false },
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('nickship')
    .setDescription('İki kişinin nicklerinden eğlenceli ship isimleri üretir.')
    .addUserOption(option =>
      option
        .setName('kisi1')
        .setDescription('İlk kişi (boş bırakırsan sen)')
        .setRequired(false)
    )
    .addUserOption(option =>
      option
        .setName('kisi2')
        .setDescription('İkinci kişi (boş bırakırsan rastgele biri)')
        .setRequired(false)
    )
    .setContexts([InteractionContextType.Guild]),

  async execute(client, ctx, options = {}) {
    const guild = ctx.guild;
    if (!guild) {
      return hybridReply(ctx, {
        content: 'Nickship komutu yalnızca sunucularda kullanılabilir.',
        ephemeral: true
      });
    }

    const actorId = ctx.user?.id ?? ctx.author?.id;
    const actor = await resolveMember(guild, actorId ? { id: actorId } : null);
    if (!actor) {
      return hybridReply(ctx, { content: 'Seni sunucuda bulamadım.', ephemeral: true });
    }

    const firstOption = options.kisi1 ?? ctx.mentions?.members?.first() ?? null;
    const secondOption = options.kisi2
      ?? ctx.mentions?.members?.filter(member => member.id !== firstOption?.id).at(0)
      ?? null;

    let firstMember;
    let secondMember;

    if (firstOption && secondOption) {
      firstMember = await resolveMember(guild, firstOption);
      secondMember = await resolveMember(guild, secondOption);
    } else if (firstOption) {
      firstMember = actor;
      secondMember = await resolveMember(guild, firstOption);
    } else {
      firstMember = actor;
      const candidates = guild.members.cache.filter(member =>
        !member.user.bot && member.id !== actor.id
      );
      secondMember = candidates.random() ?? null;
    }

    if (!firstMember || !secondMember) {
      return hybridReply(ctx, {
        content: 'Eşleştirme için başka bir sunucu üyesi bulamadım. Bir kullanıcı etiketleyebilirsin.',
        ephemeral: true
      });
    }

    if (firstMember.user.bot || secondMember.user.bot) {
      return hybridReply(ctx, {
        content: 'Bot nickleriyle ship oluşturamıyorum; iki gerçek kullanıcı seç.',
        ephemeral: true
      });
    }

    if (firstMember.id === secondMember.id) {
      return hybridReply(ctx, {
        content: 'Aynı kişiyi iki kez seçemezsin.',
        ephemeral: true
      });
    }

    const firstNick = getNickname(firstMember);
    const secondNick = getNickname(secondMember);
    const variants = makeNameVariants(firstNick, secondNick);
    const mainName = variants[0]?.value || `${firstNick} × ${secondNick}`;
    const moods = [
      {
        name: 'Soft Launch',
        detail: 'tatlı ve sakin bir ikili enerjisi',
        accent: '#d86f9b',
        accentSoft: '#f8dce8',
        background: '#fff0f5',
        ink: '#523b49'
      },
      {
        name: 'Kaos İkilisi',
        detail: 'aynı odaya girince düzeni bozan enerji',
        accent: '#7664c9',
        accentSoft: '#e5e0ff',
        background: '#f1efff',
        ink: '#37334f'
      },
      {
        name: 'Main Character',
        detail: 'hikayenin merkezindeki çift enerjisi',
        accent: '#c27b32',
        accentSoft: '#f7e5cb',
        background: '#fff5e8',
        ink: '#4f4031'
      },
      {
        name: 'Gizli Favori',
        detail: 'kimsenin beklemediği ama yakışan ikili',
        accent: '#338f7d',
        accentSoft: '#d8f0e9',
        background: '#eaf8f4',
        ink: '#304b46'
      }
    ];
    const mood = moods[Math.floor(Math.random() * moods.length)];

    try {
      const canvas = createCanvas(1024, 500);
      const canvasContext = canvas.getContext('2d');
      const alternativeNames = variants
        .filter(({ value }) => value !== mainName)
        .slice(0, 3);

      drawNickshipCard(canvasContext, {
        firstNick,
        secondNick,
        mainName,
        mood,
        alternativeNames
      });

      await drawAvatar(
        canvasContext,
        firstMember.user.displayAvatarURL({ extension: 'png', size: 256 }),
        116,
        164,
        mood
      );
      await drawAvatar(
        canvasContext,
        secondMember.user.displayAvatarURL({ extension: 'png', size: 256 }),
        908,
        164,
        mood
      );

      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'nickship.png' });
      return hybridReply(ctx, {
        content: `**${firstNick}** × **${secondNick}**`,
        files: [attachment]
      });
    } catch (error) {
      console.error('[nickship] Canvas hatası:', error);
      return hybridReply(ctx, {
        content: 'Nickship görseli hazırlanırken bir hata oluştu.',
        ephemeral: true
      });
    }
  }
};

function drawNickshipCard(ctx, { firstNick, secondNick, mainName, mood, alternativeNames }) {
  const background = ctx.createLinearGradient(0, 0, 1024, 500);
  background.addColorStop(0, mood.background);
  background.addColorStop(1, '#fffdfb');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1024, 500);

  ctx.globalAlpha = 0.42;
  ctx.fillStyle = mood.accentSoft;
  ctx.beginPath();
  ctx.arc(40, 55, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(1000, 465, 175, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.fillStyle = mood.accent;
  ctx.font = 'bold 18px Arial';
  ctx.fillText('NICKSHIP', 512, 48);
  ctx.strokeStyle = mood.accentSoft;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(430, 65);
  ctx.lineTo(594, 65);
  ctx.stroke();

  drawRoundedRect(ctx, 226, 94, 572, 246, 30, '#ffffff');
  ctx.save();
  ctx.shadowColor = `${mood.accent}30`;
  ctx.shadowBlur = 28;
  ctx.strokeStyle = `${mood.accent}35`;
  ctx.lineWidth = 2;
  roundedRectPath(ctx, 226, 94, 572, 246, 30);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = mood.accent;
  ctx.font = 'bold 15px Arial';

  drawMainName(ctx, mainName, mood);

  ctx.strokeStyle = mood.accentSoft;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(320, 270);
  ctx.lineTo(704, 270);
  ctx.stroke();

  ctx.fillStyle = mood.accent;
  ctx.font = 'bold 17px Arial';
  ctx.fillText(mood.name.toLocaleUpperCase('tr-TR'), 512, 302);
  ctx.fillStyle = '#77717a';
  ctx.font = '15px Arial';
  ctx.fillText(mood.detail, 512, 325, 510);

  drawFittedLabel(ctx, firstNick, 116, 238, 176, mood.ink);
  drawFittedLabel(ctx, secondNick, 908, 238, 176, mood.ink);
  drawMiniHeart(ctx, 512, 98, mood.accent);

  ctx.fillStyle = '#827b83';
  ctx.font = 'bold 13px Arial';
  ctx.fillText('ALTERNATİF İSİMLER', 512, 374);

  if (alternativeNames.length) {
    const cardWidth = 278;
    const gap = 16;
    const totalWidth = alternativeNames.length * cardWidth + (alternativeNames.length - 1) * gap;
    const startX = (1024 - totalWidth) / 2;

    alternativeNames.forEach(({ label, value }, index) => {
      const x = startX + index * (cardWidth + gap);
      drawRoundedRect(ctx, x, 390, cardWidth, 72, 18, '#ffffff');
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8b838b';
      ctx.font = '12px Arial';
      ctx.fillText(label.toLocaleUpperCase('tr-TR'), x + cardWidth / 2, 414);
      drawFittedLabel(ctx, value, x + cardWidth / 2, 443, cardWidth - 28, mood.accent, 23);
    });
  }

  ctx.fillStyle = `${mood.accent}99`;
  ctx.font = '12px Arial';
  ctx.fillText('Nicklerden, biraz da hayal gücünden ✦', 512, 486);
}

function drawMainName(ctx, name, mood) {
  const maxWidth = 500;
  let fontSize = 76;

  while (fontSize > 14) {
    ctx.font = `bold ${fontSize}px Arial`;
    if (ctx.measureText(name).width <= maxWidth) break;
    fontSize -= 2;
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = mood.accent;
  ctx.shadowColor = `${mood.accent}45`;
  ctx.shadowBlur = 14;
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillText(name, 512, 226, maxWidth);
  ctx.restore();
}

function drawFittedLabel(ctx, text, x, y, maxWidth, color, maxSize = 20) {
  let fontSize = maxSize;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  while (fontSize > 12) {
    ctx.font = `bold ${fontSize}px Arial`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 1;
  }

  ctx.fillStyle = color;
  ctx.fillText(text, x, y, maxWidth);
}

async function drawAvatar(ctx, avatarUrl, x, y, mood) {
  const radius = 56;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = `${mood.accent}55`;
  ctx.shadowBlur = 22;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.clip();

  try {
    const avatar = await loadImage(avatarUrl);
    ctx.drawImage(avatar, x - radius, y - radius, radius * 2, radius * 2);
  } catch {
    ctx.fillStyle = mood.accentSoft;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
  ctx.strokeStyle = mood.accent;
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawMiniHeart(ctx, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.bezierCurveTo(-28, -5, -14, -21, 0, -9);
  ctx.bezierCurveTo(14, -21, 28, -5, 0, 13);
  ctx.fill();
  ctx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius, color) {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = color;
  ctx.fill();
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
