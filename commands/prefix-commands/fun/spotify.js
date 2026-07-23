import { ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { messageSender, misc } from '#helpers';

const { drawRoundedRect, formatTime } = misc;

export default {
    name: "spotify",
    description: "Spotify'da dinlenen şarkıyı birebir özel Spotify arayüz kartıyla gösterir.",
    aliases: ["spoti", "şarkı", "dinlediğim", "müzik", "spotfy", "spo"],
    usage: "spotify [@etiket / ID]",
    category: "fun",
    execute: async (client, message, args) => {
        const sender = new messageSender(message);
        
        const member = message.mentions.members.first() ||
                       message.guild.members.cache.get(args[0]) ||
                       message.member;

        const activity = member.presence?.activities?.find(a => a.type === ActivityType.Listening && a.name === "Spotify");

        if (!activity) {
            return sender.reply(sender.errorEmbed("🎧 Bu kullanıcı şu anda Spotify dinlemiyor."));
        }

        const width = 800;
        const height = 280;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        drawRoundedRect(ctx, 0, 0, width, height, 20, "#181818");

        drawRoundedRect(ctx, 230, 20, 150, 30, 8, "rgba(29, 185, 84, 0.15)");
        ctx.font = "bold 12px sans-serif";
        ctx.fillStyle = "#1DB954";
        ctx.fillText("ŞU ANDA ÇALIYOR", 245, 40);

        const listenerText = `Dinleyen: ${member.user.displayName || member.user.username}`;
        ctx.font = "12px sans-serif";
        const textWidth = ctx.measureText(listenerText).width;
        drawRoundedRect(ctx, width - textWidth - 40, 20, textWidth + 20, 26, 13, "#282828");
        ctx.fillStyle = "#b3b3b3";
        ctx.fillText(listenerText, width - textWidth - 30, 37);

        // Şarkı Adı
        ctx.font = "bold 26px sans-serif";
        ctx.fillStyle = "#ffffff";
        let title = activity.details || "Bilinmeyen Şarkı";
        if (title.length > 30) title = title.substring(0, 27) + "...";
        ctx.fillText(title, 230, 85);

        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#b3b3b3";
        let artist = activity.state || "Bilinmeyen Sanatçı";
        if (artist.length > 35) artist = artist.substring(0, 32) + "...";
        ctx.fillText(artist, 230, 112);

        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#727272";
        let album = activity.assets?.largeText || "";
        if (album.length > 40) album = album.substring(0, 37) + "...";
        ctx.fillText(album, 230, 133);

        const startTime = new Date(activity.timestamps?.start).getTime();
        const endTime = new Date(activity.timestamps?.end).getTime();
        const now = Date.now();

        const currentMs = Math.max(0, now - startTime);
        const totalMs = Math.max(1, endTime - startTime);
        const progress = Math.min(1, currentMs / totalMs);

        const barX = 230;
        const barY = 160;
        const barWidth = 530;
        const barHeight = 4;

        drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 2, "#4d4d4d");
        // Dolu kısım (Yeşil)
        if (progress > 0) {
            drawRoundedRect(ctx, barX, barY, Math.max(8, barWidth * progress), barHeight, 2, "#1DB954");
        }

        ctx.font = "13px sans-serif";
        ctx.fillStyle = "#b3b3b3";
        ctx.fillText(formatTime(currentMs), barX, barY + 22);
        ctx.fillText(formatTime(totalMs), barX + barWidth - 35, barY + 22);

        try {
            const imageUrl = `https://i.scdn.co/image/${activity.assets?.largeImage?.slice(8)}`;
            const coverImage = await loadImage(imageUrl);

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(25, 25, 180, 180, 15);
            ctx.clip();
            ctx.drawImage(coverImage, 25, 25, 180, 180);
            ctx.restore();
        } catch (e) {
            drawRoundedRect(ctx, 25, 25, 180, 180, 15, "#282828");
        }

        const trackUrl = activity.syncId ? `https://open.spotify.com/track/${activity.syncId}` : null;
        const row = new ActionRowBuilder();

        if (trackUrl) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel("Spotify'da Aç")
                    .setStyle(ButtonStyle.Link)
                    .setURL(trackUrl)
            );
        }

        const imageBuffer = await canvas.encode("png");

        return message.reply({
            files: [{ name: "spotify-card.png", attachment: imageBuffer }],
            components: [row]
        });
    }
};