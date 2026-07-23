import { ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { messageSender, misc } from '#helpers';

const { drawRoundedRect, formatTime } = misc;

export default {
    name: "spotify",
    description: "Spotify'da dinlenen şarkıyı premium cam efektli özel tasarım kartla gösterir.",
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

        const width = 850;
        const height = 290;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        let coverImage;
        try {
            const imageUrl = `https://i.scdn.co/image/${activity.assets?.largeImage?.slice(8)}`;
            coverImage = await loadImage(imageUrl);
        } catch (e) {
            coverImage = null;
        }

        if (coverImage) {
            ctx.save();
            ctx.filter = "blur(35px) brightness(0.4)";
            ctx.drawImage(coverImage, -50, -50, width + 100, height + 100);
            ctx.restore();
        } else {
            ctx.fillStyle = "#121212";
            ctx.fillRect(0, 0, width, height);
        }

        const overlayGrad = ctx.createLinearGradient(0, 0, width, height);
        overlayGrad.addColorStop(0, "rgba(18, 18, 18, 0.65)");
        overlayGrad.addColorStop(1, "rgba(0, 0, 0, 0.85)");
        drawRoundedRect(ctx, 0, 0, width, height, 24, overlayGrad);

        drawRoundedRect(ctx, 1, 1, width - 2, height - 2, 24, null, "rgba(255, 255, 255, 0.08)");

        const imgX = 30;
        const imgY = 30;
        const imgSize = 230;

        if (coverImage) {
            ctx.save();
            ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
            ctx.shadowBlur = 25;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 10;
            
            ctx.beginPath();
            ctx.roundRect(imgX, imgY, imgSize, imgSize, 18);
            ctx.fill();
            ctx.clip();
            
            ctx.shadowColor = "transparent";
            ctx.drawImage(coverImage, imgX, imgY, imgSize, imgSize);
            ctx.restore();
        } else {
            drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, 18, "#282828");
        }

        drawRoundedRect(ctx, 280, 32, 140, 28, 14, "rgba(29, 185, 84, 0.18)", "rgba(29, 185, 84, 0.4)");
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = "#1ed760";
        ctx.fillText("• ŞU ANDA ÇALIYOR", 292, 50);

        const listenerText = `Dinleyen: ${member.user.displayName || member.user.username}`;
        ctx.font = "12px sans-serif";
        const textMetrics = ctx.measureText(listenerText);
        const badgeWidth = textMetrics.width + 24;
        
        drawRoundedRect(ctx, width - badgeWidth - 30, 32, badgeWidth, 28, 14, "rgba(255, 255, 255, 0.07)");
        ctx.fillStyle = "#e1e1e1";
        ctx.fillText(listenerText, width - badgeWidth - 18, 50);

        const textX = 280;

        ctx.font = "bold 28px sans-serif";
        ctx.fillStyle = "#ffffff";
        let title = activity.details || "Bilinmeyen Şarkı";
        if (title.length > 26) title = title.substring(0, 23) + "...";
        ctx.fillText(title, textX, 102);

        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "#b3b3b3";
        let artist = activity.state || "Bilinmeyen Sanatçı";
        if (artist.length > 34) artist = artist.substring(0, 31) + "...";
        ctx.fillText(artist, textX, 130);

        ctx.font = "13px sans-serif";
        ctx.fillStyle = "#888888";
        let album = activity.assets?.largeText || "";
        if (album.length > 38) album = album.substring(0, 35) + "...";
        ctx.fillText(album, textX, 150);

        const startTime = new Date(activity.timestamps?.start).getTime();
        const endTime = new Date(activity.timestamps?.end).getTime();
        const now = Date.now();

        const currentMs = Math.max(0, now - startTime);
        const totalMs = Math.max(1, endTime - startTime);
        const progress = Math.min(1, currentMs / totalMs);

        const barX = 280;
        const barY = 190;
        const barWidth = 530;
        const barHeight = 6;

        drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 3, "rgba(255, 255, 255, 0.15)");

        const filledWidth = Math.max(12, barWidth * progress);
        if (progress > 0) {
            ctx.save();
            ctx.shadowColor = "#1DB954";
            ctx.shadowBlur = 8;
            drawRoundedRect(ctx, barX, barY, filledWidth, barHeight, 3, "#1DB954");
            ctx.restore();

            ctx.beginPath();
            ctx.arc(barX + filledWidth, barY + (barHeight / 2), 6, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
        }

        ctx.font = "bold 12px sans-serif";
        ctx.fillStyle = "#a7a7a7";
        ctx.fillText(formatTime(currentMs), barX, barY + 24);
        
        ctx.font = "bold 12px sans-serif";
        const totalTimeStr = formatTime(totalMs);
        const totalTimeWidth = ctx.measureText(totalTimeStr).width;
        ctx.fillText(totalTimeStr, barX + barWidth - totalTimeWidth, barY + 24);

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