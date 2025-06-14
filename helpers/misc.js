import { GatewayIntentBits } from 'discord.js';

function randomColor(){
	return Math.floor(Math.random() * (0xffffff + 1))
}

function itentsMiddle(){
	return [
		GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
	]
}

function itentsAll(){
    return Object.keys(GatewayIntentBits).map((intent) => GatewayIntentBits[intent])
}

function calculateLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

export {
	randomColor,
	itentsMiddle,
	itentsAll,
	calculateLevel
}
