import { Loaders } from '#helpers'

const { getPrefixCommands, getSlashCommands, getEvents, 
	deploySlashCommands, eventExecuter, commandExecuter } = Loaders

import config from '../config.json' with { type: 'json' };

class Core {
    constructor(client, token, botId){
		this.client = client
		this.token = token
		this.botId = botId
	}
	
	async loaders() {
	  const client = this.client;
	  
	  const prefixCommands = await getPrefixCommands()
	  const slashCommands = await getSlashCommands()
	  const events = await getEvents()
	 
	  await commandExecuter(client, slashCommands, prefixCommands)
	  
	  if(config.AUTO_SLASH_COMMAND_DEPLOY) {
	    await deploySlashCommands(this.token, this.botId, slashCommands)
	  }

	  await eventExecuter(client, events)  
	}
	
	connect(){
		const connected = this.client.login(this.token);
		return connected
	}
}

export default Core