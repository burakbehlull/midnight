import { messageSender } from '#helpers';

export default {
  name: 'say',
  description: 'Sunucudaki istatistikleri gösterir.',
  usage: 'say',
  async execute(client, message, args) {
    const { guild } = message;
	const sender = new messageSender(message);

    const totalMembers = guild.memberCount;
    const onlineMembers = guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size;
    const voiceMembers = guild.channels.cache
      .filter(c => c.type === 2)
      .map(c => c.members.size)
      .reduce((a, b) => a + b, 0);

    const boostCount = guild.premiumSubscriptionCount || 0;
    const boostTier = guild.premiumTier;

	const embed = sender.embed({
		title: null,
		color: 0x2b2d31,
		description: `
		**${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}** | <t:${Math.floor(message.createdTimestamp / 1000)}:R>
		
		> **Sunucumuzda toplam \`${totalMembers}\` üye var.** ( \`${onlineMembers}\` çevrimiçi )
		> **Seste toplam \`${voiceMembers}\` kullanıcı var.**
		> **Sunucumuza toplam \`${boostCount}\` takviye yapılmış.** ( \`${boostTier}. seviye\` )`
	})

    message.channel.send({ embeds: [embed] });
  }
};
