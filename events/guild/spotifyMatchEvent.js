import { Events, ActivityType } from 'discord.js';
import { Settings } from '#models';
import { createSpotifyMatchCard } from '../../helpers/spotifyMatchCard.js';

const MATCH_COOLDOWN = 5 * 60 * 1000;
const recentMatches = new Map();

function getSpotifyActivity(presence) {
  if (!presence?.activities?.length) return null;
  for (const a of presence.activities) {
    const nameOk = a.name && String(a.name).toLowerCase().includes('spotify');
    const typeOk = a.type === ActivityType.Listening || a.type === 2;
    if (nameOk && typeOk) return a;
  }
  return null;
}

function getTrackKey(activity) {
  if (activity.syncId) return `sync:${activity.syncId}`;
  const details = (activity.details || '').toLowerCase().trim();
  const state = (activity.state || '').toLowerCase().trim();
  if (details && state) return `meta:${details}||${state}`;
  return null;
}

function getCoverUrl(activity) {
  const key = activity.assets?.largeImage || '';
  if (!key) return null;
  const id = key.startsWith('spotify:') ? key.slice(8) : key;
  return `https://i.scdn.co/image/${id}`;
}

function makeMatchKey(guildId, userId1, userId2, trackKey) {
  const ids = [userId1, userId2].sort();
  return `${guildId}:${ids[0]}:${ids[1]}:${trackKey}`;
}

export default {
  name: Events.PresenceUpdate,
  async execute(client, oldPresence, newPresence) {
    try {
      if (!newPresence?.guild) return;
      if (!newPresence.userId) return;

      const guild = newPresence.guild;
      const userId = newPresence.userId;
      const user1 = guild.members.cache.get(userId) || newPresence.member;
      if (!user1) return;
      if (user1.user?.bot) return;

      const settings = await Settings.findOne({ guildId: guild.id });
      if (!settings || !settings.spotifyMatchEnabled || !settings.spotifyMatchChannelId) return;

      const channel = guild.channels.cache.get(settings.spotifyMatchChannelId);
      if (!channel) return;

      const activity = getSpotifyActivity(newPresence);
      if (!activity) return;

      const trackKey = getTrackKey(activity);
      if (!trackKey) return;

      let matchedMember = null;
      for (const [, presence] of guild.presences.cache) {
        if (presence.userId === userId) continue;

        const otherActivity = getSpotifyActivity(presence);
        if (!otherActivity) continue;

        const otherKey = getTrackKey(otherActivity);
        if (otherKey && otherKey === trackKey) {
          matchedMember = guild.members.cache.get(presence.userId);
          if (matchedMember && !matchedMember.user.bot) break;
          matchedMember = null;
        }
      }

      if (!matchedMember) return;

      const matchKey = makeMatchKey(guild.id, userId, matchedMember.id, trackKey);
      const lastSent = recentMatches.get(matchKey);
      if (lastSent && Date.now() - lastSent < MATCH_COOLDOWN) return;

      recentMatches.set(matchKey, Date.now());

      const coverUrl = getCoverUrl(activity);
      const user1Name = user1.displayName || user1.user.displayName || user1.user.username;
      const user2Name = matchedMember.displayName || matchedMember.user.displayName || matchedMember.user.username;

      let buffer;
      try {
        buffer = await createSpotifyMatchCard({
          user1Name,
          user1Avatar: user1.user.displayAvatarURL({ extension: 'png', size: 256 }),
          user2Name,
          user2Avatar: matchedMember.user.displayAvatarURL({ extension: 'png', size: 256 }),
          coverUrl: coverUrl || 'https://i.scdn.co/image/ab67616d0000b273000000000000000000000000',
          title: activity.details || 'Bilinmeyen Şarkı',
          artist: activity.state || 'Bilinmeyen Sanatçı',
          guildName: guild.name,
        });
      } catch (err) {
        console.error('[spotify-match] görsel oluşturma hatası:', err);
        return;
      }

      const mentionText = `<@${user1.id}> ve <@${matchedMember.id}> aynı şarkıda eşleşti!`;

      await channel.send({
        content: mentionText,
        files: [{ attachment: buffer, name: 'spotify-match.png' }],
      }).catch(err => console.error('[spotify-match] mesaj gönderme hatası:', err));

    } catch (error) {
      console.error('[spotify-match] event hatası:', error);
    }
  }
};
