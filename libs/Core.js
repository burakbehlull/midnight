import { Loaders } from '#helpers'

const { getPrefixCommands, getSlashCommands, getHybridCommands, getEvents, 
	deploySlashCommands, eventExecuter, commandExecuter, getDeployableSlashCommands } = Loaders

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
	  const hybridCommands = await getHybridCommands()
	  const events = await getEvents()
	 
	  await commandExecuter(client, slashCommands, prefixCommands, hybridCommands)
	  
	  if(config.AUTO_SLASH_COMMAND_DEPLOY) {
	    const deployable = await getDeployableSlashCommands()
	    await deploySlashCommands(this.token, this.botId, deployable)
	  }

	  await eventExecuter(client, events)  
	}
	
	connect(){
		const connected = this.client.login(this.token);
		return connected
	}
}

export default Core