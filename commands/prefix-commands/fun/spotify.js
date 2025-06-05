import { ActivityType } from "discord.js";
import canvafy from "canvafy";

import { messageSender } from '#helpers';

export default {
    name: "spotify",
    description: "Spotify'da dinlenen şarkıyı sadece görsel olarak gösterir.",
    aliases: ["spoti", "şarkı", "dinlediğim", "müzik", "spotfy"],
    usage: "spotify [@etiket / ID]",
    execute: async (client, message, args) => {
		const sender = new messageSender(message);
        const member = message.mentions.members.first() ||
                       message.guild.members.cache.get(args[0]) ||
                       message.member;

        const activity = member.presence?.activities?.find(a => a.type === ActivityType.Listening && a.name === "Spotify");

        if (!activity) return sender.reply(sender.errorEmbed("🎧 Bu kullanıcı şu anda Spotify dinlemiyor."));
        

        const imageUrl = `https://i.scdn.co/image/${activity.assets.largeImage.slice(8)}`;
        const canvas = await new canvafy.Spotify()
            .setAuthor(activity.state)
            .setAlbum(activity.assets.largeText)
            .setImage(imageUrl)
            .setTimestamp(
                Date.now() - new Date(activity.timestamps.start).getTime(),
                new Date(activity.timestamps.end).getTime() - new Date(activity.timestamps.start).getTime()
            )
            .setTitle(activity.details)
            .build();

        return message.reply({
            files: [{ name: "spotify.png", attachment: canvas }]
        });
    }
};