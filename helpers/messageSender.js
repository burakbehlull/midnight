import { EmbedBuilder } from 'discord.js';

class messageSender {
	constructor(client) {
		this.client = client;
	}

	embed({ title, description, image, thumbnail, fields=[], color=0x0099FF, footer }){
       const guild = this.client
		
	   const user = guild.author ?? guild.user
       const IFooter = footer ?? {
		text: user.username,
		iconURL: user.displayAvatarURL()
		};
		
        const IEmbed= new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setTimestamp()
        .setFooter(IFooter)
		if (description) IEmbed.setDescription(description)
		if (image) embed.setImage(image);
		if (thumbnail) embed.setThumbnail(thumbnail);
		if (fields.length) embed.addFields(...fields);
        return IEmbed
    }

	send(embed, channelId) {
		const id = channelId
		const channel = this.client.channels.cache.get(id);

		if (!channel) {
			console.warn(`[messageSender] Kanal bulunamadı: ${id}`);
			return;
		}

		channel.send({ embeds: [embed] }).catch(console.error);
	}
	
	reply(content, userSees){
		const type = typeof(content)
		console.log("TYPE", type)
		if(type == "object"){
			this.client.reply({ embeds: [content], ephemeral: userSees })
			return
		}
		this.client.reply({ content, ephemeral: userSees })
	}


}

export default messageSender