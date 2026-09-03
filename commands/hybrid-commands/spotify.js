import { ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, InteractionContextType, ApplicationIntegrationType } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";

import { misc, hybridReply } from '#helpers';
import Manager from "#managers";

const { drawRoundedRect, formatTime } = misc;

export default {
  name: "spotify",
  description: "Spotify'da dinlenen şarkıyı kart olarak gösterir.",
  aliases: ["spoti", "şarkı", "dinlediğim", "müzik", "spotfy", "spo"],
  permissions: { enabled: false },
  cooldown: 5,

  data: new SlashCommandBuilder()
    .setName("spotify")
    .setDescription("Spotify'da dinlenen şarkıyı kart olarak gösterir.")
    .addUserOption(opt =>
      opt.setName("user").setDescription("Kullanıcı (boş = kendin)").setRequired(false)
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

      let rawU = options?.user;
      let targetId = null;
      let targetIsSelf = false;

      if (rawU?.id) {
        targetId = rawU.id;
      } else if (rawU?.user?.id) {
        targetId = rawU.user.id;
      }
      const selfId = ctx.user?.id ?? ctx.author?.id ?? ctx.member?.id ?? null;
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

      // ==== 2. ADIM: Hızlı kontroller ====
      if (ctx.member?.id === targetId && ctx.member?.presence) {
        const f = findSpotify(ctx.member);
        if (f) { activity = f; presenceOwner = ctx.member; }
      }
      if (!activity && rawU?.presence && (rawU.id === targetId || rawU.user?.id === targetId)) {
        const f = findSpotify(rawU);
        if (f) { activity = f; presenceOwner = rawU; }
      }
      // KENDİ İSE: ctx.user üzerinde presence olabilir (DM'de bile bazen gelir)
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

      // ==== 3. ADIM: TÜM sunucularda GuildMember ara (en güvenilir yöntem) ====
      // Presence YALNIZCA GuildMember üzerinde vardır. User objesinde YOKTUR.
      if (!activity && client.guilds?.cache?.size) {
        const guilds = Array.from(client.guilds.cache.values());

        // 3A) Cache'te ara
        for (const g of guilds) {
          const m = g.members?.cache?.get(targetId);
          if (!m) continue;
          foundInGuild = true;
          const f = findSpotify(m);
          if (f) { activity = f; presenceOwner = m; break; }
        }

        // 3B) Force: true ile tekil fetch
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

        // 3C) withPresences: true toplu fetch (EN GARANTİLİ - Discord presence'ı bununla gönderiyor)
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

      // ==== 4. ADIM: Son çare User objeleri ====
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

      const width = 850, height = 290;
      const canvas = createCanvas(width, height);
      const c = canvas.getContext("2d");

      let cover = null;
      try {
        const key = activity.assets?.largeImage ?? "";
        const url = `https://i.scdn.co/image/${key.startsWith("spotify:") ? key.slice(8) : key}`;
        cover = await loadImage(url);
      } catch {}

      if (cover) {
        c.save(); c.filter = "blur(35px) brightness(0.4)";
        c.drawImage(cover, -50, -50, width + 100, height + 100); c.restore();
      } else {
        c.fillStyle = "#121212"; c.fillRect(0, 0, width, height);
      }

      const g = c.createLinearGradient(0, 0, width, height);
      g.addColorStop(0, "rgba(18,18,18,0.65)");
      g.addColorStop(1, "rgba(0,0,0,0.85)");
      drawRoundedRect(c, 0, 0, width, height, 24, g);
      drawRoundedRect(c, 1, 1, width - 2, height - 2, 24, null, "rgba(255,255,255,0.08)");

      const ix = 30, iy = 30, is = 230;
      if (cover) {
        c.save();
        c.shadowColor = "rgba(0,0,0,0.6)"; c.shadowBlur = 25; c.shadowOffsetY = 10;
        c.beginPath(); c.roundRect(ix, iy, is, is, 18); c.fill(); c.clip();
        c.shadowColor = "transparent";
        c.drawImage(cover, ix, iy, is, is);
        c.restore();
      } else {
        drawRoundedRect(c, ix, iy, is, is, 18, "#282828");
      }

      drawRoundedRect(c, 280, 32, 140, 28, 14, "rgba(29,185,84,0.18)", "rgba(29,185,84,0.4)");
      c.font = "bold 11px sans-serif"; c.fillStyle = "#1ed760";
      c.fillText("• ŞU ANDA ÇALIYOR", 292, 50);

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
      drawRoundedRect(c, width - bw - 30, 32, bw, 28, 14, "rgba(255,255,255,0.07)");
      c.fillStyle = "#e1e1e1"; c.fillText(lt, width - bw - 18, 50);

      const tx = 280;
      c.font = "bold 28px sans-serif"; c.fillStyle = "#fff";
      let title = activity.details || "Bilinmeyen Şarkı";
      if (title.length > 26) title = title.slice(0, 23) + "...";
      c.fillText(title, tx, 102);

      c.font = "bold 16px sans-serif"; c.fillStyle = "#b3b3b3";
      let artist = activity.state || "Bilinmeyen Sanatçı";
      if (artist.length > 34) artist = artist.slice(0, 31) + "...";
      c.fillText(artist, tx, 130);

      c.font = "13px sans-serif"; c.fillStyle = "#888";
      let album = activity.assets?.largeText || "";
      if (album.length > 38) album = album.slice(0, 35) + "...";
      c.fillText(album, tx, 150);

      const st = new Date(activity.timestamps?.start).getTime();
      const et = new Date(activity.timestamps?.end).getTime();
      const cur = Math.max(0, Date.now() - st);
      const tot = Math.max(1, et - st);
      const p = Math.min(1, cur / tot);

      const bx = 280, by = 190, bw2 = 530, bh = 6;
      drawRoundedRect(c, bx, by, bw2, bh, 3, "rgba(255,255,255,0.15)");

      const fw = Math.max(12, bw2 * p);
      if (p > 0) {
        c.save(); c.shadowColor = "#1DB954"; c.shadowBlur = 8;
        drawRoundedRect(c, bx, by, fw, bh, 3, "#1DB954");
        c.restore();
        c.beginPath();
        c.arc(bx + fw, by + bh / 2, 6, 0, Math.PI * 2);
        c.fillStyle = "#fff"; c.fill();
      }

      c.font = "bold 12px sans-serif"; c.fillStyle = "#a7a7a7";
      c.fillText(formatTime(cur), bx, by + 24);
      const tts = formatTime(tot);
      const tw = c.measureText(tts).width;
      c.fillText(tts, bx + bw2 - tw, by + 24);

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
