import { Economy } from "#models"

export default {
  name: 'money',
  description: 'Bakiyeni gösterir.',
  aliases: ['cash', 'bakiye'],
  usage: '.money',
  category: 'economy',

  permissions: {
    enabled: false
  },

  async execute(client, message) {
    const userId = message.author.id;
	  const name = message.author.globalName || message.author.username

    const user = await Economy.findOne({ userId }) || new Economy({ userId });
    message.channel.send(`_${name}_, **__${user.money}__** paraya sahipsin!`);
  }
};
