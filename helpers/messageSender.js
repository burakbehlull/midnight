import { EmbedBuilder } from 'discord.js';
import { hybridReply, isInteraction } from './hybridContext.js';

const colors = {
  liveRed: '#FF6B6B', 
  gold: '#FFD93D', 
  green: '#6BCB77', 
  blue: '#4D96FF', 
  purple: '#C780FA', 
  lightPink: '#F38BA0', 
  orange: '#FF9F45', 
  grayBlue: '#8892B0', 
  mintGreen: '#00C9A7', 
  pastelPurple: '#9E768F', 
  blueGray: '#6A9BD8', 
  lightBlue: '#3AB0FF', 
  lavanta: '#B983FF', 
  iceBlue: '#9AD0EC', 
  pastelPink: '#F1C0E8',
  lightBlue2: '#6A9BD8',
  darkBlue: '#3A5F8A'
};

class messageSender {
	constructor(client) {
		this.client = client;
		this.colors = colors;
	}

	embed({ title, description, image, thumbnail, fields=[], author, color=0x0099FF, footer, timestamp}){
       const guild = this.client
		
	    const user = guild.author ?? guild.user
        const IFooter = footer ?? {
			text: user.username,
			iconURL: user.displayAvatarURL()
		};
		
        const IEmbed= new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setTimestamp(timestamp)
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
		const channel = this.client.channels?.cache?.get(id) || this.client.guild?.channels?.cache?.get(id) || this.client.client?.channels?.cache?.get(id);

		if (!channel) {
			console.warn(`[messageSender] Kanal bulunamadı: ${id}`);
			return;
		}

		channel.send({ embeds: [embed], components: components }).catch(console.error);
	}
	
	async reply(content, userSees, components){
		const type = typeof(content)
		const payload = {}
		if(type == "object"){
			payload.embeds = [content]
		} else {
			payload.content = content
		}
		if (components) payload.components = components
		if (isInteraction(this.client) && userSees) {
			payload.ephemeral = true
		}
		return await hybridReply(this.client, payload)
	}
	
	errorEmbed(description){
		const msg = this.client
		const guild = msg?.guild ?? null;
		const author = guild && guild.name
			? { name: guild.name, iconURL: guild.iconURL?.() ?? undefined }
			: null;
		return this.embed({
		  author,
		  color: 0xFF0000,
		  title: null,
		  description: description
		})
	}
	
	classic(description){
		const msg = this.client
		const guild = msg?.guild ?? null;
		const author = guild && guild.name
			? { name: guild.name, iconURL: guild.iconURL?.() ?? undefined }
			: null;
		return this.embed({
		  author,
		  color: 0x89CFF0,
		  title: null,
		  description: description
		})
	}


}

export default messageSender