function pickMentionableId(token) {
  if (!token || typeof token !== 'string') return null;
  const uidMatch = token.match(/^<@!?(\d{17,19})>$/);
  if (uidMatch) return uidMatch[1];
  const ridMatch = token.match(/^<@&(\d{17,19})>$/);
  if (ridMatch) return ridMatch[1];
  const cidMatch = token.match(/^<#(\d{17,19})>$/);
  if (cidMatch) return cidMatch[1];
  if (/^\d{17,19}$/.test(token)) return token;
  return null;
}

function getOptionTypeMeta(command) {
  const meta = new Map();
  if (!command?.data?.options?._options && !Array.isArray(command?.data?.options)) {
    return meta;
  }
  const rawOptions = command?.data?.options?._options || command?.data?.options || [];
  for (const opt of rawOptions) {
    meta.set(opt.name, {
      name: opt.name,
      type: opt.type,
      required: !!opt.required
    });
  }
  return meta;
}

const OPTION_CHANNEL = 7;
const OPTION_ROLE = 8;
const OPTION_MENTIONABLE = 9;
const OPTION_USER = 6;
const OPTION_INTEGER = 4;
const OPTION_NUMBER = 10;
const OPTION_BOOLEAN = 5;
const OPTION_STRING = 3;
const OPTION_ATTACHMENT = 11;

export async function normalizePrefixArgs(message, command, rawArgs) {
  const result = {};
  if (!command) return result;

  const meta = getOptionTypeMeta(command);
  const entries = Array.from(meta.entries());
  const tokens = [...(rawArgs || [])];

  const authorId = message.author?.id;
  const guild = message.guild;
  const channel = message.channel;
  const client = message.client;

  let position = 0;
  for (let i = 0; i < entries.length; i++) {
    const [name, opt] = entries[i];
    const isLast = i === entries.length - 1;

    let token;
    if (isLast && opt.type === OPTION_STRING && position < tokens.length) {
      token = tokens.slice(position).join(' ');
      position = tokens.length;
    } else {
      token = tokens[position];
    }

    if (token === undefined || token === null || token === '') {
      if (opt.required) {
        result[name] = null;
      } else {
        result[name] = undefined;
      }
      position += 1;
      continue;
    }

    const id = pickMentionableId(token);

    if (opt.type === OPTION_USER) {
      if (id && guild) {
        const member = await guild.members.fetch(id).catch(() => null);
        result[name] = member || (client?.users?.cache?.get(id) ?? null);
      } else {
        result[name] = undefined;
      }
    } else if (opt.type === OPTION_ROLE) {
      if (id && guild) {
        result[name] = guild.roles?.cache?.get(id) ?? null;
      } else {
        result[name] = null;
      }
    } else if (opt.type === OPTION_CHANNEL) {
      if (id && guild) {
        result[name] = guild.channels?.cache?.get(id) ?? channel ?? null;
      } else {
        result[name] = channel ?? null;
      }
    } else if (opt.type === OPTION_MENTIONABLE) {
      if (id && guild) {
        const member = await guild.members.fetch(id).catch(() => null);
        const role = guild.roles?.cache?.get(id) ?? null;
        result[name] = member || role || null;
      } else {
        result[name] = null;
      }
    } else if (opt.type === OPTION_INTEGER) {
      const n = parseInt(token, 10);
      result[name] = Number.isFinite(n) ? n : null;
    } else if (opt.type === OPTION_NUMBER) {
      const n = parseFloat(token);
      result[name] = Number.isFinite(n) ? n : null;
    } else if (opt.type === OPTION_BOOLEAN) {
      const low = String(token).toLowerCase();
      result[name] = ['1', 'true', 'evet', 'yes', 'y', 'e', 'on'].includes(low);
    } else if (opt.type === OPTION_STRING) {
      result[name] = token;
    } else {
      result[name] = token;
    }
    if (!isLast || opt.type !== OPTION_STRING) {
      position += 1;
    }
  }

  return Object.assign({}, result, { _raw: tokens, _authorId: authorId });
}

export async function normalizeSlashOptions(interaction) {
  const result = {};
  if (!interaction?.options) return result;

  const data = interaction.options;
  if (typeof data.data?._group === 'string') result._group = data.data._group;
  if (typeof data.data?._subcommand === 'string') result._subcommand = data.data._subcommand;

  const hoisted = data._hoistedOptions || [];
  for (const opt of hoisted) {
    result[opt.name] = opt.value ?? opt.member ?? opt.role ?? opt.channel ?? opt.user ?? opt.attachment ?? null;
    if (opt.type === 'user' || opt.type === OPTION_USER) {
      result[opt.name] = opt.member ?? data.getUser(opt.name) ?? null;
    }
    if (opt.type === 'channel' || opt.type === OPTION_CHANNEL) {
      result[opt.name] = data.getChannel(opt.name) ?? null;
    }
    if (opt.type === 'role' || opt.type === OPTION_ROLE) {
      result[opt.name] = data.getRole(opt.name) ?? null;
    }
    if (opt.type === 'mentionable' || opt.type === OPTION_MENTIONABLE) {
      result[opt.name] = data.getMentionable(opt.name) ?? null;
    }
    if (opt.type === 'attachment' || opt.type === OPTION_ATTACHMENT) {
      result[opt.name] = data.getAttachment(opt.name) ?? null;
    }
    if (opt.type === 'string' || opt.type === OPTION_STRING) {
      result[opt.name] = data.getString(opt.name);
    }
    if (opt.type === 'integer' || opt.type === OPTION_INTEGER) {
      result[opt.name] = data.getInteger(opt.name);
    }
    if (opt.type === 'number' || opt.type === OPTION_NUMBER) {
      result[opt.name] = data.getNumber(opt.name);
    }
    if (opt.type === 'boolean' || opt.type === OPTION_BOOLEAN) {
      result[opt.name] = data.getBoolean(opt.name);
    }
  }

  result._user = interaction.user;
  result._member = interaction.member || null;

  return result;
}

export function getActor(ctx) {
  if (!ctx) return null;
  return ctx?.author || ctx?.user || null;
}

export function getMemberActor(ctx) {
  if (!ctx) return null;
  return ctx?.member || null;
}

export function isInteraction(ctx) {
  return !!(ctx?.isChatInputCommand?.() || ctx?.isButton?.() || ctx?.isAnySelectMenu?.() || ctx?.user);
}

export async function hybridReply(ctx, payload) {
  if (!ctx) return null;

  const isInter = isInteraction(ctx);
  const safePayload = payload || {};

  if (isInter) {
    if (ctx.replied || ctx.deferred) {
      try {
        return await ctx.followUp(safePayload).catch(() => null);
      } catch {
        return await ctx.channel?.send(safePayload).catch(() => null);
      }
    }
    try {
      return await ctx.reply(safePayload).catch(async () => {
        return await ctx.channel?.send(safePayload).catch(() => null);
      });
    } catch {
      return await ctx.channel?.send(safePayload).catch(() => null);
    }
  }

  try {
    if (ctx.channel?.send) return await ctx.channel.send(safePayload).catch(() => null);
  } catch {}
  return null;
}
