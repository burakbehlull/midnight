
import ModeratorActions from '../guard/models/ModeratorActions.js';


export async function logModeratorAction({
  guildId,
  moderatorId,
  botId = null,
  action,
  targetId = null,
  reason = null,
}) {
  try {
    if (!guildId || !moderatorId || !action) return null;

    return await ModeratorActions.create({
      guildId,
      moderatorId,
      botId,
      action,
      targetId,
      reason,
    });
  } catch (error) {
    console.error('[moderatorActions] Kayıt oluşturulamadı:', error);
    return null;
  }
}

export default { logModeratorAction };
