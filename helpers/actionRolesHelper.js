import { ButtonStyle } from 'discord.js';

export function parseEmoji(input) {
  if (!input) return null;

  const custom = input.match(/^<(a)?:([a-zA-Z0-9_]+):(\d+)>$/);
  if (custom) {
    return {
      animated: !!custom[1],
      name: custom[2],
      id: custom[3],
      raw: input,
      isCustom: true,
      mention: input,
      reactionName: custom[3]
    };
  }

  const standardEmojiTest = /^(?:\p{Emoji}\p{Emoji_Modifier_Base}?\p{Emoji_Modifier}?\uFE0F?|[\u2600-\u27BF]|[\u{1F300}-\u{1FAFF}])+$/u;
  if (standardEmojiTest.test(input) && !/^\d+$/.test(input)) {
    return {
      animated: false,
      name: input,
      id: null,
      raw: input,
      isCustom: false,
      mention: input,
      reactionName: input
    };
  }

  const justId = input.match(/^(\d+)$/);
  if (justId) {
    return {
      animated: false,
      name: null,
      id: input,
      raw: input,
      isCustom: true,
      mention: `<:_:${input}>`,
      reactionName: input
    };
  }

  return null;
}

export function emojiDisplay(parsed) {
  if (!parsed) return '❓';
  if (parsed.isCustom) {
    if (parsed.animated) return `<a:${parsed.name || '_'}:${parsed.id}>`;
    return `<:${parsed.name || '_'}:${parsed.id}>`;
  }
  return parsed.name || parsed.raw || '❓';
}

export function parseButtonStyle(input, fallback = 'secondary') {
  if (!input) return fallback;
  const s = String(input).toLowerCase().trim();

  const map = {
    'primary': 'primary',
    'mavi': 'primary',
    'blue': 'primary',
    'blurple': 'primary',

    'secondary': 'secondary',
    'gri': 'secondary',
    'gray': 'secondary',
    'grey': 'secondary',

    'success': 'success',
    'yesil': 'success',
    'yesıl': 'success',
    'green': 'success',

    'danger': 'danger',
    'kirmizi': 'danger',
    'kırmızı': 'danger',
    'red': 'danger',

    'warning': 'warning',
    'warn': 'warning',
    'sari': 'warning',
    'sarı': 'warning',
    'yellow': 'warning'
  };

  return map[s] || fallback;
}

export function buttonStyleToEnum(styleName) {
  const m = {
    'primary': ButtonStyle.Primary,
    'secondary': ButtonStyle.Secondary,
    'success': ButtonStyle.Success,
    'danger': ButtonStyle.Danger,
    'warning': ButtonStyle.Success
  };
  if (styleName === 'warning') return ButtonStyle.Danger;
  return m[styleName] || ButtonStyle.Secondary;
}

export function buttonStyleLabel(styleName) {
  const labels = {
    'primary': 'Primary (Mavi)',
    'secondary': 'Secondary (Gri)',
    'success': 'Success (Yeşil)',
    'danger': 'Danger (Kırmızı)',
    'warning': 'Warning (Sarı)'
  };
  return labels[styleName] || styleName;
}

export function roleIdFromMention(input, mentions) {
  if (!input) return null;
  const m = String(input).match(/^<@&(\d+)>$/);
  if (m) return m[1];
  if (/^\d+$/.test(input)) return input;
  if (mentions && mentions.roles) {
    const found = mentions.roles.first();
    return found ? found.id : null;
  }
  return null;
}

export function buttonLabelRenderForDiscord(rawLabel, fallbackRoleName) {
  const lbl = (rawLabel && rawLabel.trim()) ? String(rawLabel).trim() : '';
  if (!lbl) {
    return {
      text: (fallbackRoleName || 'Rol').slice(0, 80),
      hasCustomEmoji: false
    };
  }

  const pureEmoji = parseEmoji(lbl);
  if (pureEmoji) {
    if (pureEmoji.isCustom) {
      return {
        text: '',
        hasCustomEmoji: true,
        customEmojiId: pureEmoji.id,
        customEmojiAnimated: pureEmoji.animated,
        customEmojiName: pureEmoji.name
      };
    }
    return { text: lbl, hasCustomEmoji: false };
  }

  const hasCustom = /<(a)?:[a-zA-Z0-9_]+:(\d+)>/.test(lbl);
  if (hasCustom) {
    let pickedId = null;
    let pickedName = null;
    let pickedAnimated = false;
    const textClean = lbl.replace(/<(a)?:([a-zA-Z0-9_]+):(\d+)>/g, (full, a, name, id) => {
      if (!pickedId) {
        pickedId = id;
        pickedName = name || null;
        pickedAnimated = !!a;
      }
      return name || '';
    }).replace(/\s+/g, ' ').trim();

    return {
      text: textClean.slice(0, 80),
      hasCustomEmoji: !!pickedId,
      customEmojiId: pickedId,
      customEmojiAnimated: pickedAnimated,
      customEmojiName: pickedName
    };
  }

  return { text: lbl.slice(0, 80), hasCustomEmoji: false };
}

export function buttonLabelDisplayForEmbed(rawLabel, fallbackRoleName) {
  const lbl = (rawLabel && rawLabel.trim()) ? String(rawLabel).trim() : (fallbackRoleName || 'Rol');
  const emojiParsed = parseEmoji(lbl);
  if (emojiParsed) return emojiDisplay(emojiParsed);
  const withInline = lbl.replace(/<(a)?:([a-zA-Z0-9_]+):(\d+)>/g, (full, a, name, id) => {
    const p = { animated: !!a, name: name || '_', id: id, isCustom: true };
    return emojiDisplay(p);
  });
  return withInline;
}
