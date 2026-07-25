import { EmbedBuilder } from 'discord.js';

import { Utils } from '#helpers'
import { colors, themes } from '#data'

class ThemeBuilder extends Utils {
	constructor(client){
		super(client)
		this.client = client
		this.colors = colors
		this.themes = themes
		this.guild = client.guild || client
	}
	
	randomColor(){
		return Math.floor(Math.random() * (0xffffff + 1))
	}
	
	getNameAndAvatars(type, action){
		const interaction = action ?? this.guild
		const user = interaction.author ?? interaction.user

		if(type=="user") {
			const getAvatar = user.displayAvatarURL({ dynamic: true })
			return {
				text: user.username,
				name: user.username,
				iconURL: getAvatar || null
			}
		} else if(type=="guild") {
			const getIcon = interaction.guild.iconURL({ dynamic: true })
			const getGuildName = interaction.name || interaction.guild.name
			return {
				text: getGuildName, 
				name: getGuildName, 
				iconURL: getIcon || null
			}
		}
	}
	
	createTheme({ heritage, title, description, image, thumbnail, fields=[], 
		author, color=0x0099FF, footer, timestamp=false, timestampContent=false}){
		
		const IEmbed = new EmbedBuilder(heritage ?? {})
		
		if (color) IEmbed.setColor(color)
		if (title) IEmbed.setTitle(title)
		if (footer) IEmbed.setFooter(footer)
		if (author) IEmbed.setAuthor(author)
		if (description) IEmbed.setDescription(description)
		if (image) IEmbed.setImage(image);
		if (thumbnail) IEmbed.setThumbnail(thumbnail);
		if (fields.length) IEmbed.addFields(...fields);
		if (timestamp) IEmbed.setTimestamp()
		if (timestampContent) IEmbed.setTimestamp(timestampContent)
		
		return IEmbed
	}
	
	async embedThemeBuilder(type, {
		heritage=null,
		action=false,
		randomColor=false,
		
		author=null,
		description=null,
		title=null,
		footer=null,
		
		color=null,
		thumbnail=null,
		image=null,
		fields=[],
		
	}={}){

		const init = action ? (theme) => ({
			embed: theme,
			reply: (options = {}) => {
				const { ephemeral = false, components = null } = options;
				return this.send({ embed: theme, reply: true, components, ephemeral });
			},
			send: (options = {}) => {
				const { id = null, components = null } = options;
				return this.send({ id, embed: theme, components });
			}
		}) : (theme)=> theme

		let theme;
		
		const rc = randomColor ? this.randomColor() : color
		
		switch(type){
			case themes.success:
				theme = this.createTheme({
					heritage,
					
					author, title, description, fields, footer,
					image, thumbnail,
					
					color: rc || colors.green,
					timestamp: true
			})
				
			return init(theme)
			
			case themes.error:
				theme = this.createTheme({
					heritage,
					
					author, title, description, 
					fields, image, thumbnail,
					footer: footer || this.getNameAndAvatars("user"),

					
					color: rc || colors.red,
					timestamp: true
			})
				
			return init(theme)
			
			case themes.classic:
				theme = this.createTheme({
					heritage,
					
					author: author || this.getNameAndAvatars("guild"),
					
					title, description, fields, 
					image, thumbnail,
					
					footer: footer || this.getNameAndAvatars("user"),

					
					color: rc || colors.lightBlue3,
					timestamp: true
			})
				
			return init(theme)
			
			
			case themes.rich:
				theme = this.createTheme({
					heritage,
					author: author || this.getNameAndAvatars("guild"),
					
					title, description, fields,
					image, thumbnail,
					
					color: rc,
					footer: footer || this.getNameAndAvatars("user"),
					timestamp: true,
				})
			return init(theme)
			
			case themes.warn:
				theme = this.createTheme({
					heritage,
					author: author || this.getNameAndAvatars("guild"),
					
					title, description, fields,
					image, thumbnail,
					
					color: rc || colors.gold2,
					footer: footer || this.getNameAndAvatars("user"),
					timestamp: true,
				})
			return init(theme)
				
		}
	}
	
}

export default ThemeBuilder