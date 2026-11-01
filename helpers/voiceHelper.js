import { joinVoiceChannel, getVoiceConnection } from '@discordjs/voice';

export function joinGuildVoice(client, guildId, channelId, group) {
  if (!client || !guildId || !channelId) return null;

  const guild = client.guilds?.cache?.get(guildId);
  if (!guild) return null;

  const channel = guild.channels?.cache?.get(channelId);
  if (!channel || typeof channel.isVoiceBased !== 'function' || !channel.isVoiceBased()) {
    return null;
  }

  const existing = getVoiceConnection(guildId, group);
  if (existing) {
    if (existing.joinConfig?.channelId === channel.id) return existing;
    existing.destroy();
  }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    group,
    selfDeaf: true,
    selfMute: false,
  });

  connection.on('error', () => {});
  return connection;
}

export function leaveGuildVoice(guildId, group) {
  const connection = getVoiceConnection(guildId, group);
  if (connection) connection.destroy();
}
