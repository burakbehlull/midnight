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
