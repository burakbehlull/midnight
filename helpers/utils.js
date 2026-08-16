import { hybridReply, isInteraction } from './hybridContext.js';

class Utils {
	constructor(client){
		this.client = client
		this.guild = client.guild || client
	}
	
	async getChannelHybrid(channelId, interaction){
		try {
			
			const source = interaction ? interaction : this.client
			const client = 
				source?.client ??
				source?.user?.client ??
				source;

			if (!client || !client.channels) {
				console.error("[Sender/getChannel]: Invalid source or client not found");
				return null;
			}

			let channel = client.channels.cache.get(channelId);

			if (!channel) {
				channel = await client.channels.fetch(channelId);
			}

			return channel;
		} catch (err) {
			console.error(`[Sender/getChannel]: Cannot fetch channel (${channelId})`, err);
			return null;
		}

	}
	
	async getUserHybrid(userId, interaction) {
		try {
			const source = interaction ? interaction : this.client
			const client =
				source?.client ??
				source?.user?.client ??
				source;

			if (!client || !client.users) {
				console.error("[Sender/getUser]: Invalid source or client not found");
				return null;
			}

			let user = client.users.cache.get(userId);

			if (!user) {
				user = await client.users.fetch(userId);
			}

			return user;
		} catch (err) {
			console.error(`[Sender/getUser]: Cannot fetch user (${userId})`, err);
			return null;
		}
	}
	
	async getUser(userId) {
		const guild = this.guild
		if (!userId) {
			console.error("[Sender/getMember]: Missing userId or guild");
			return null;
		}

		try {
			let member = guild.members.cache.get(userId);
			if (!member) {
				member = await guild.members.fetch(userId);
			}
			return member;
		} catch (err) {
			console.error(`[Sender/getUser]: Cannot fetch member (${userId})`, err);
			return null;
		}
	}
	
	async getChannel(channelId) {
		const guild = this.guild
		
		if (!channelId) {
			console.error("[Sender/getGuildChannel]: Missing channelId or guild");
			return null;
		}
		

		try {
			let channel = guild.channels?.cache?.get(channelId);
			if (!channel) {
				channel = await guild.channels?.fetch(channelId);
			}

			if (channel && guild?.id && channel.guild?.id !== guild.id) {
				console.warn(`[Sender/getGuildChannel]: Channel (${channelId}) does not belong to this guild`);
				return null;
			}

			return channel || null;
		} catch (err) {
			console.error(`[Sender/getGuildChannel]: Error while checking channel (${channelId})`, err);
			return null;
		}
	}

	async send({id, reply, text, embed, embeds, components, ephemeral}={}){
		
		const content = {};
		
        if (text) content.content = text;
		if (embeds || embed) content.embeds = embeds ? embeds : [embed];
        if (components) content.components = components;
        if (isInteraction(this.client) && ephemeral) content.ephemeral = ephemeral;
		
		if(reply){
			return await hybridReply(this.client, content)
		} else if(id){
			const channel = await this.getChannelHybrid(id)
			if (channel) return await channel.send(content).catch(() => null);
		} else {
			const channel = this.client.channel || this.client.guild?.channels?.cache?.get(this.client.channelId);
			if (channel) return await channel.send(content).catch(() => null);
		}
		
	}
}

export default Utils

