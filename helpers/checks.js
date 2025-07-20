export function isMessageMeaningfullyUpdated(oldMessage, newMessage) {
  if (!oldMessage || !newMessage) return false;

  if (oldMessage.content !== newMessage.content) return true;

  const oldAttachments = [...oldMessage.attachments.values()];
  const newAttachments = [...newMessage.attachments.values()];

  if (oldAttachments.length !== newAttachments.length) return true;

  for (let i = 0; i < oldAttachments.length; i++) {
    if (oldAttachments[i].url !== newAttachments[i].url) {
      return true;
    }
  }

  return false;
}

export function splitMessage(text, maxLength = 1500) {
  const messages = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxLength;
    if (end >= text.length) {
      messages.push(text.slice(start));
      break;
    }

    let slice = text.slice(start, end);
    let lastSentenceEnd = Math.max(
      slice.lastIndexOf('.'),
      slice.lastIndexOf('!'),
      slice.lastIndexOf('?')
    );

    if (lastSentenceEnd > 0 && lastSentenceEnd > maxLength * 0.5) {
      end = start + lastSentenceEnd + 1;
    }

    messages.push(text.slice(start, end).trim());
    start = end;
  }

  return messages;
}


