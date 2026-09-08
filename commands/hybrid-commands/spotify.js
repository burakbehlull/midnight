import { ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, InteractionContextType, ApplicationIntegrationType } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";

import { misc, hybridReply, cosmeticsHelper } from '#helpers';
import Manager from "#managers";

const { drawRoundedRect, formatTime } = misc;

const THEMES = {
  default: {
    variant: "dark",
    backgroundBlur: { filter: "blur(35px) brightness(0.4)" },
    gradient: ["rgba(18,18,18,0.65)", "rgba(0,0,0,0.85)"],
    fallbackBg: "#121212",
    coverFallbackBg: "#282828",
    coverShadow: { color: "rgba(0,0,0,0.5)", blur: 22, offsetY: 8 },
    borderStroke: "rgba(255,255,255,0.1)",
    borderWidth: 1.5,
    outerShadow: { color: "rgba(0,0,0,0.35)", blur: 0, offsetX: 0, offsetY: 0 },
    nowPlaying: { bg: "rgba(29,185,84,0.18)", stroke: "rgba(29,185,84,0.45)", text: "#1ed760" },
    listenerBadge: { bg: "rgba(255,255,255,0.07)", stroke: "rgba(255,255,255,0.1)", text: "#e1e1e1" },
    title: "#ffffff",
    artist: "#b3b3b3",
    album: "#888888",
    progressBg: "rgba(255,255,255,0.15)",
    progressFill: "#1DB954",
    progressShadow: "#1DB954",
    timeText: "#a7a7a7",
    thumbDot: "#ffffff",
    radius: {
      card: 80,
      cover: 56,
      badge: 12,
      bar: 3.5
    }
  },
  light: {
    variant: "light",
    backgroundBlur: { filter: "blur(38px) saturate(1.15) brightness(1.05)" },
    gradient: ["rgba(255,252,247,0.88)", "rgba(248,246,250,0.94)"],
    fallbackBg: "#f7f5f0",
    coverFallbackBg: "#e8e4dc",
    coverShadow: { color: "rgba(30,20,10,0.18)", blur: 22, offsetY: 8 },
    borderStroke: "rgba(0,0,0,0.08)",
    borderWidth: 1,
    outerShadow: { color: "rgba(0,0,0,0)", blur: 0, offsetX: 0, offsetY: 0 },
    nowPlaying: { bg: "rgba(29,185,84,0.12)", stroke: "rgba(29,185,84,0.35)", text: "#179848" },
    listenerBadge: { bg: "rgba(20,18,14,0.05)", stroke: "rgba(20,18,14,0.08)", text: "#1c1a16" },
    title: "#0d0b08",
    artist: "#383026",
    album: "#6e6254",
    progressBg: "rgba(140,90,80,0.22)",
    progressFill: "#E03434",
    progressShadow: "rgba(224,52,52,0.45)",
    timeText: "#4e463c",
    thumbDot: "#ffffff",
    radius: {
      card: 80,
      cover: 56,
      badge: 12,
      bar: 3.5
    }
  }
};

function getTheme(slug) {
  return THEMES[slug] || THEMES.default;
}

export default {
  name: "spotify",
  description: "Spotify'da dinlenen şarkıyı kart olarak gösterir.",
  aliases: ["spoti", "şarkı", "dinlediğim", "müzik", "spotfy", "spo"],
  permissions: { enabled: false },
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("spotify")
    .setDescription("Spotify'da dinlenen şarkıyı kart olarak gösterir.")
    .addSubcommand(sub =>
      sub.setName("show")
        .setDescription("Şu anki şarkıyı kart olarak gösterir.")
        .addUserOption(opt =>
          opt.setName("user").setDescription("Kullanıcı (boş = kendin)").setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName("use")
        .setDescription("Spotify temasını değiştirir.")
        .addStringOption(opt =>
          opt.setName("theme").setDescription("Tema adı, ID veya 'default'").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("themes")
        .setDescription("Mevcut ve kullanılabilir Spotify temalarını listeler.")
    )
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    ])
    .setContexts([
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
      InteractionContextType.Guild
    ]),

  async execute(client, ctx, options) {
    try {
      const manager = new Manager(client, { action: ctx });
      const selfId = ctx.user?.id ?? ctx.author?.id ?? ctx.member?.id ?? null;

      const isPrefix = ctx.content && typeof ctx.content === 'string';
      const prefixArgs = options && Array.isArray(options) ? [...options] : [];
      const sub = options?.subcommand || options?._group || null;

      let subActual = sub;
      if (isPrefix && prefixArgs.length > 0) {
        const first = String(prefixArgs[0]).toLowerCase();
        if (first === 'use' || first === 'set') {
          subActual = 'use';
          prefixArgs.shift();
        } else if (first === 'themes' || first === 'theme' || first === 'temalar') {
          subActual = 'themes';
          prefixArgs.shift();
        } else {
          subActual = 'show';
        }
      }
      if (!subActual) subActual = 'show';

      if (subActual === 'use') {
        if (!selfId) {
          return manager.sender.reply(manager.sender.errorEmbed("Kullanıcı kimliğin algılanamadı."));
        }
        let themeArg;
        if (!isPrefix) {
          themeArg = options?.theme;
        } else {
          themeArg = prefixArgs.shift();
        }
        if (!themeArg) {
          return manager.sender.reply(manager.sender.errorEmbed("Kullanım: `k!spotify use <tema/ID/default>` örn: `k!spotify use light` veya `k!spotify use 6` veya `k!spotify use default`"));
        }
        const res = await cosmeticsHelper.setActiveCosmetic(selfId, "spotify", themeArg);
        
        if (!res.ok) {
          return manager.sender.reply(manager.sender.errorEmbed(res.message || "Tema ayarlanamadı."));
        }
        
        const themeName = res.item?.name || (res.isDefault ? "Default (Dark)" : "Bilinmeyen Tema");
        let successMsg;
        
        if (res.changed === false) {
          successMsg = `ℹ️ Spotify teması zaten **${themeName}** olarak ayarlı.`;
        } else {
          successMsg = `✅ Spotify teması başarıyla **${themeName}** olarak değiştirildi!`;
        }
        
        const embed = manager.sender.embed({
          title: "🎧 Spotify Tema",
          description: successMsg,
          color: 'Green'
        });
        
        return manager.sender.reply(embed);
      }

      if (subActual === 'themes') {
        if (!selfId) {
          return manager.sender.reply(manager.sender.errorEmbed("Kullanıcı kimliğin algılanamadı."));
        }
        const list = await cosmeticsHelper.listAvailableCosmetics(selfId, "spotify");
        const meta = cosmeticsHelper.getModuleMeta("spotify");
        const lines = list.map(it => {
          const mark = it.active ? '✅' : (it.owned ? '🔓' : '🔒');
          const idLine = it.isDefault ? '(ücretsiz)' : `(id:${it.id}${it.price ? `, fiyat:${it.price}₵` : ''}${it.count && it.count > 0 ? `, envanter:${it.count}x` : ''})`;
          return `${mark} **${it.name}** [\`${it.slug}\`] ${idLine}${it.active ? ' — aktif' : ''}`;
        });
        const e = manager.sender.embed({
          title: `🎧 ${meta.label} Temaları`,
          color: 'Green',
          description: lines.join('\n') + `\n\nKullanmak için: \`k!spotify use <slug/id>\` veya \`k!spotify use default\``
        });
        return manager.sender.reply(e);
      }

      let rawU = options?.user;
      let targetId = null;
      let targetIsSelf = false;

      if (rawU?.id) {
        targetId = rawU.id;
      } else if (rawU?.user?.id) {
        targetId = rawU.user.id;
      }
      if (!targetId && isPrefix && prefixArgs.length > 0) {
        const arg = prefixArgs[0];
        const m = String(arg).match(/\d+/);
        if (m) { targetId = m[0]; prefixArgs.shift(); }
        if (!targetId && ctx.mentions?.users?.size) {
          const u = ctx.mentions.users.first();
          if (u) { targetId = u.id; prefixArgs.shift(); }
        }
      }
      if (!targetId) targetId = selfId;
      targetIsSelf = !!targetId && !!selfId && targetId === selfId;

      if (!targetId) {
        return manager.sender.reply(manager.sender.errorEmbed("Kullanıcı bulunamadı."));
      }

      let activity = null;
      let presenceOwner = null;
      let foundInGuild = false;

      const findSpotify = (src) => {
        const acts = src?.presence?.activities;
        if (!Array.isArray(acts) || !acts.length) return null;
        for (const a of acts) {
          const t = typeof a.type === "number" ? a.type : Number(a.type);
          const nameOk = a.name && String(a.name).toLowerCase().includes("spotify");
          const typeOk = t === ActivityType.Listening || t === 2;
          const hasAssets = !!a.assets?.largeImage || !!a.syncId || !!a.assets?.largeText;
          if (nameOk && (typeOk || hasAssets)) return a;
        }
        return null;
      };

      if (ctx.member?.id === targetId && ctx.member?.presence) {
        const f = findSpotify(ctx.member);
        if (f) { activity = f; presenceOwner = ctx.member; }
      }
      if (!activity && rawU?.presence && (rawU.id === targetId || rawU.user?.id === targetId)) {
        const f = findSpotify(rawU);
        if (f) { activity = f; presenceOwner = rawU; }
      }
      if (!activity && targetIsSelf) {
        for (const s of [ctx.user, ctx.author, ctx.member].filter(Boolean)) {
          const f = findSpotify(s);
          if (f) { activity = f; presenceOwner = s; break; }
        }
        if (!activity && client.users?.cache?.has?.(targetId)) {
          const cs = client.users.cache.get(targetId);
          const f = findSpotify(cs);
          if (f) { activity = f; presenceOwner = cs; }
        }
      }

      if (!activity && client.guilds?.cache?.size) {
        const guilds = Array.from(client.guilds.cache.values());

        for (const g of guilds) {
          const m = g.members?.cache?.get(targetId);
          if (!m) continue;
          foundInGuild = true;
          const f = findSpotify(m);
          if (f) { activity = f; presenceOwner = m; break; }
        }

        if (!activity) {
          for (const g of guilds) {
            try {
              const m = await g.members.fetch({ user: targetId, force: true }).catch(() => null);
              if (!m) continue;
              foundInGuild = true;
              const f = findSpotify(m);
              if (f) { activity = f; presenceOwner = m; break; }
            } catch {}
          }
        }

        if (!activity) {
          for (const g of guilds) {
            try {
              const all = await g.members.fetch({ withPresences: true, force: true }).catch(() => null);
              if (!all) continue;
              const m = all.get(targetId);
              if (!m) continue;
              foundInGuild = true;
              const f = findSpotify(m);
              if (f) { activity = f; presenceOwner = m; break; }
            } catch (e) {
            }
          }
        }
      }

      if (!activity) {
        const last = [ctx.user, ctx.author, client.users?.cache?.get(targetId)].filter(Boolean);
        for (const s of last) {
          const f = findSpotify(s);
          if (f) { activity = f; presenceOwner = s; break; }
        }
      }

      if (!activity) {
        let msg = "🎧 Bu kullanıcı şu anda Spotify dinlemiyor.";
        if (!targetIsSelf) {
          if (client.guilds?.cache?.size && !foundInGuild) {
            msg = "⚠️ **Bu kullanıcı ile ortak sunucum yok.** Presence (aktivite) bilgilerini görebilmem için kullanıcının botun bulunduğu EN AZ BİR sunucuda üye olması gerekir. Aksi takdirde Discord aktivite verisini paylaşmıyor.";
          } else if (foundInGuild) {
            msg = "🎧 Ortak sunucuda üyesi bulundu ama şu an Spotify aktivitesi görünmüyor. (Kullanıcı offline/invisible olabilir, Spotify açık olmayabilir ya da Discord henüz yaymamış olabilir.)";
          }
        }
        return manager.sender.reply(manager.sender.errorEmbed(msg));
      }

      const themeTargetUserId = selfId || targetId;
      let themeSlug = "default";
      try {
        if (themeTargetUserId) {
          themeSlug = (await cosmeticsHelper.getActiveCosmetic(themeTargetUserId, "spotify")) || "default";
        }
      } catch {
        themeSlug = "default";
      }
      
      if (!THEMES[themeSlug]) {
        const fallback = Object.keys(THEMES)[0] || "default";
        themeSlug = THEMES[fallback] ? fallback : "default";
      }
      const t = getTheme(themeSlug);
      const R = t.radius;
      const OS = t.outerShadow;

      const width = 720, height = 250;
      const hasOuterShadow = !!(OS && (OS.blur > 0 || OS.offsetX || OS.offsetY));
      const canvasWidth = hasOuterShadow ? width + 100 : width;
      const canvasHeight = hasOuterShadow ? height + 100 : height;
      const offsetX = hasOuterShadow ? 50 : 0;
      const offsetY = hasOuterShadow ? 50 : 0;

      const canvas = createCanvas(canvasWidth, canvasHeight);
      const c = canvas.getContext("2d");

      let cover = null;
      try {
        const key = activity.assets?.largeImage ?? "";
        const url = `https://i.scdn.co/image/${key.startsWith("spotify:") ? key.slice(8) : key}`;
        cover = await loadImage(url);
      } catch {}

      if (hasOuterShadow) {
        c.save();
        c.shadowColor = OS.color || "rgba(0,0,0,0.2)";
        c.shadowBlur = OS.blur || 0;
        c.shadowOffsetX = OS.offsetX || 0;
        c.shadowOffsetY = OS.offsetY || 0;
        c.beginPath();
        c.roundRect(offsetX, offsetY, width, height, R.card);
        c.fillStyle = t.fallbackBg;
        c.fill();
        c.restore();
      }

      c.save();
      c.beginPath();
      c.roundRect(offsetX, offsetY, width, height, R.card);
      c.clip();

      if (cover) {
        c.save();
        const defaultFilter = t.variant === "light"
          ? "blur(38px) saturate(1.15) brightness(1.05)"
          : "blur(35px) brightness(0.4)";
        c.filter = (t.backgroundBlur && t.backgroundBlur.filter) || defaultFilter;
        c.drawImage(cover, offsetX - 50, offsetY - 50, width + 100, height + 100);
        c.restore();
      } else {
        c.fillStyle = t.fallbackBg; c.fillRect(offsetX, offsetY, width, height);
      }

      const g = c.createLinearGradient(offsetX, offsetY, offsetX + width, offsetY + height);
      g.addColorStop(0, t.gradient[0]);
      g.addColorStop(1, t.gradient[1]);
      c.fillStyle = g; c.fillRect(offsetX, offsetY, width, height);
      c.restore();

      if (t.borderStroke && t.borderWidth > 0) {
        drawRoundedRect(c, offsetX, offsetY, width, height, R.card, null, t.borderStroke, t.borderWidth);
      } else {
        c.save();
        c.beginPath();
        c.roundRect(offsetX + 0.5, offsetY + 0.5, width - 1, height - 1, Math.max(0, R.card - 0.5));
        c.strokeStyle = "rgba(0,0,0,0.05)";
        c.lineWidth = 1;
        c.stroke();
        c.restore();
      }

      const ix = offsetX + 25, iy = offsetY + 25, is = 200;
      if (cover) {
        c.save();
        c.shadowColor = t.coverShadow.color; c.shadowBlur = t.coverShadow.blur; c.shadowOffsetY = t.coverShadow.offsetY;
        c.beginPath(); c.roundRect(ix, iy, is, is, R.cover); c.fill(); c.clip();
        c.shadowColor = "transparent";
        c.drawImage(cover, ix, iy, is, is);
        c.restore();
      } else {
        drawRoundedRect(c, ix, iy, is, is, R.cover, t.coverFallbackBg, null, 1);
      }

      const owner = presenceOwner || client.users?.cache?.get(targetId);
      const dn =
        owner?.user?.displayName ||
        owner?.displayName ||
        owner?.user?.username ||
        owner?.username ||
        owner?.globalName ||
        (ctx?.member?.displayName ?? ctx?.user?.username ?? ctx?.author?.username ?? "Kullanıcı");
      const lt = `Dinleyen: ${dn}`;
      c.font = "12px sans-serif";
      const bw = c.measureText(lt).width + 24;
      const badgeX = (offsetX + width) - bw - 25;
      drawRoundedRect(c, badgeX, offsetY + 28, bw, 28, R.badge, t.listenerBadge.bg, t.listenerBadge.stroke, 1);
      c.fillStyle = t.listenerBadge.text; c.fillText(lt, badgeX + 12, offsetY + 46);

      const tx = offsetX + 240;
      const tY1 = offsetY + 88;
      const tY2 = offsetY + 112;
      const tY3 = offsetY + 130;

      c.font = "bold 24px sans-serif"; c.fillStyle = t.title;
      let title = activity.details || "Bilinmeyen Şarkı";
      if (title.length > 28) title = title.slice(0, 25) + "...";
      c.fillText(title, tx, tY1);

      c.font = "bold 15px sans-serif"; c.fillStyle = t.artist;
      let artist = activity.state || "Bilinmeyen Sanatçı";
      if (artist.length > 36) artist = artist.slice(0, 33) + "...";
      c.fillText(artist, tx, tY2);

      c.font = "12px sans-serif"; c.fillStyle = t.album;
      let album = activity.assets?.largeText || "";
      if (album.length > 40) album = album.slice(0, 37) + "...";
      c.fillText(album, tx, tY3);

      const st = new Date(activity.timestamps?.start).getTime();
      const et = new Date(activity.timestamps?.end).getTime();
      const cur = Math.max(0, Date.now() - st);
      const tot = Math.max(1, et - st);
      const p = Math.min(1, cur / tot);

      const bx = offsetX + 240, by = offsetY + 165, bw2 = 450, bh = 7;
      drawRoundedRect(c, bx, by, bw2, bh, R.bar, t.progressBg);

      const fw = Math.max(12, bw2 * p);
      if (p > 0) {
        c.save(); c.shadowColor = t.progressShadow; c.shadowBlur = 8;
        drawRoundedRect(c, bx, by, fw, bh, R.bar, t.progressFill);
        c.restore();
        c.beginPath();
        c.arc(bx + fw, by + bh / 2, 6, 0, Math.PI * 2);
        c.fillStyle = t.thumbDot; c.fill();
      }

      c.font = "bold 11px sans-serif"; c.fillStyle = t.timeText;
      c.fillText(formatTime(cur), bx, by + 20);
      const tts = formatTime(tot);
      const tw = c.measureText(tts).width;
      c.fillText(tts, bx + bw2 - tw, by + 20);

      const row = new ActionRowBuilder();
      if (activity.syncId) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel("Spotify'da Aç")
            .setStyle(ButtonStyle.Link)
            .setURL(`https://open.spotify.com/track/${activity.syncId}`)
        );
      }

      const buf = await canvas.encode("png");
      const payload = { files: [{ name: "spotify-card.png", attachment: buf }] };
      if (row.components.length) payload.components = [row];

      return hybridReply(ctx, payload);

    } catch (err) {
      console.error("[spotify hybrid error]", err);
    }
  }
};
