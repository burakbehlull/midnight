import { EmbedBuilder } from 'discord.js';

class messageSender {
	constructor(client) {
		this.client = client;
	}

	embed({ title, description, image, thumbnail, fields=[], author, color=0x0099FF, footer }){
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
		if (author) IEmbed.setAuthor(author)
		if (description) IEmbed.setDescription(description)
		if (image) IEmbed.setImage(image);
		if (thumbnail) IEmbed.setThumbnail(thumbnail);
		if (fields.length) IEmbed.addFields(...fields);
        return IEmbed
    }

	send(embed, channelId, components) {
		const id = channelId
		const channel = this.client.channels.cache.get(id);

		if (!channel) {
			console.warn(`[messageSender] Kanal bulunamadı: ${id}`);
			return;
		}

		channel.send({ embeds: [embed], components: components }).catch(console.error);
	}
	
	reply(content, userSees, components){
		const type = typeof(content)
		if(type == "object"){
			this.client.reply({ embeds: [content], components: components, ephemeral: userSees })
			return
		}
		this.client.reply({ content, components: components, ephemeral: userSees })
	}
	
	errorEmbed(description){
		const msg = this.client
		return this.embed({
		  author: { name: msg.guild.name, iconURL: msg.guild.iconURL()},
		  color: 0xFF0000,
		  title: null,
		  description: description
		})
	}
	
	classic(description){
		const msg = this.client
		return this.embed({
		  author: { name: msg.guild.name, iconURL: msg.guild.iconURL()},
		  color: 0x89CFF0,
		  title: null,
		  description: description
		})
	}


}

export default messageSender