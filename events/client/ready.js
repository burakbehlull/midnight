import { Events } from 'discord.js';
import config from '../../config.json' with { type: 'json' };

export default {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`${client.user.tag} is here for you!`);
		
		client.user.setPresence({
			activities: [
				{
					name: config.ACTIVITY_NAME,
					type: config.ACTIVITY_TYPE,
				}
			],
			status: config.ACTIVITY_STATUS,
		});
		
	},
};
