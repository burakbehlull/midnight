import { Events } from 'discord.js';
import { modLogger, fetchPartialNeed } from '#helpers';

export default {
  name: Events.MessageDelete,
  async execute(client, message) {
    message = await fetchPartialNeed(message);

    if (!message?.author || message?.author?.bot) return;

    const logger = new modLogger(client);
    const guild = message.guild;

    const content = message.content?.trim() || null;
    const attachmentInfo = message.attachments.size > 0
      ? `**Ekler**: ${[...message.attachments.values()].map(a => a.url).join("\n")}`
      : '';

    const description = `
		**Kişi**: <@${message.author.id}>
		**Kanal**: <#${message.channel.id}>
		**Silinen Mesaj**: ${content ? `\`${content}\`` : "*Boş içerik veya sadece embed vardı*"}
		${attachmentInfo}`.trim();

    await logger.logEvent({
      guild,
      type: 'message',
      color: '#d90f0f',
      title: 'Mesaj Silindi',
      author: {
        name: guild?.name ?? "Sunucu",
        iconURL: guild?.iconURL() ?? null
      },
      footer: {
        text: message.author.tag,
        iconURL: message.author.displayAvatarURL()
      },
      description
    });
  }
};
