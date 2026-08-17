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
      //  ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    ])
    .setContexts([
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
      // InteractionContextType.Guild
    ]),

  async execute(client, ctx, options) {
    try {
      const manager = new Manager(client, { action: ctx });

      // ==== HEM PREFIX HEM SLASH: options.user ====
      const member = options?.user || ctx.member;
      const userId = member?.id ?? ctx.user?.id ?? ctx.author?.id;
      if (!userId) {
        return manager.sender.reply(manager.sender.errorEmbed("Kullanıcı bulunamadı."));
      }

      let activity = null;
      let presenceOwner = null;

      const quickSources = [
        member,
        ctx.member,
        ctx.user,
        client.users?.cache?.get(userId),
      ].filter(Boolean);

      for (const src of quickSources) {
        if (activity) break;
        const acts = src?.presence?.activities;
        if (Array.isArray(acts) && acts.length) {
          activity = acts.find(
            a => a.type === ActivityType.Listening && a.name === "Spotify"
          ) || null;
          if (activity) presenceOwner = src;
        }
      }

      if (!activity && client.guilds?.cache?.size) {
        outer: for (const g of client.guilds.cache.values()) {
          const m = g.members?.cache?.get(userId);
          if (!m || !m.presence?.activities?.length) continue;
          const found = m.presence.activities.find(
            a => a.type === ActivityType.Listening && a.name === "Spotify"
          );
          if (found) {
            activity = found;
            presenceOwner = m;
            break outer;
          }
        }
      }

      if (!activity && client.guilds?.cache?.size) {
        outer: for (const g of client.guilds.cache.values()) {
          try {
            const m = await g.members.fetch(userId).catch(() => null);
            if (!m || !m.presence?.activities?.length) continue;
            const found = m.presence.activities.find(
              a => a.type === ActivityType.Listening && a.name === "Spotify"
            );
            if (found) {
              activity = found;
              presenceOwner = m;
              break outer;
            }
          } catch {}
        }
      }

      if (!activity) {
        return manager.sender.reply(
          manager.sender.errorEmbed("🎧 Bu kullanıcı şu anda Spotify dinlemiyor.")
        );
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

      const owner = presenceOwner || member;
      const dn =
        owner?.user?.displayName ||
        owner?.user?.username ||
        owner?.displayName ||
        owner?.username ||
        owner?.globalName ||
        (ctx?.user?.username ?? ctx?.author?.username ?? "Kullanıcı");
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
