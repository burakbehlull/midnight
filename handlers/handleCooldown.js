import { Collection } from 'discord.js'
import { messageSender } from '#helpers'

const cooldowns = new Collection();

async function handleCooldown({ userId, commandName, cooldownInSeconds = 3, send, client, context }) {
  const now = Date.now();
  const cooldownAmount = cooldownInSeconds * 1000;

  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Collection());
  }

  const timestamps = cooldowns.get(commandName);
  const expirationTime = (timestamps.get(userId) || 0) + cooldownAmount;

  if (now < expirationTime) {
    const timeLeft = ((expirationTime - now) / 1000).toFixed(1);

    const embedHelper = new messageSender(context);
    const errorEmbed = embedHelper.errorEmbed(`⏳ Bu komutu tekrar kullanmak için **${timeLeft} saniye** beklemelisin.`);

    const sentMessage = await send(errorEmbed);

	if (sentMessage && sentMessage.deletable) {
	  setTimeout(() => {
		sentMessage.delete().catch(() => {});
	  }, cooldownAmount);
	}

	return false;
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);
  return true;
}

export default handleCooldown
