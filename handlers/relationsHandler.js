import { UserRelations } from '#models';

async function updateMessageFriendship(userId, guildId, userName, recentUsers) {
  if (recentUsers.length === 0) return;

  const userRelation = await UserRelations.findOneAndUpdate(
    { userId, guildId },
    {},
    { upsert: true, new: true }
  );

  for (const friend of recentUsers) {
    if (friend.userId === userId) continue;

    let friendEntry = userRelation.messageFriends.find(f => f.friendId === friend.userId);
    
    if (friendEntry) {
      friendEntry.interactions += 1;
      friendEntry.lastInteraction = new Date();
      if (!friendEntry.friendName && friend.userName) {
        friendEntry.friendName = friend.userName;
      }
    } else {
      userRelation.messageFriends.push({
        friendId: friend.userId,
        friendName: friend.userName || '',
        interactions: 1,
        lastInteraction: new Date()
      });
    }
  }

  userRelation.messageFriends.sort((a, b) => b.interactions - a.interactions);
  if (userRelation.messageFriends.length > 20) {
    userRelation.messageFriends = userRelation.messageFriends.slice(0, 20);
  }

  await userRelation.save();
}

async function updateVoiceFriendship(userId, guildId, userName, friendId, friendName, durationMs) {
  const userRelation = await UserRelations.findOneAndUpdate(
    { userId, guildId },
    {},
    { upsert: true, new: true }
  );

  let friendEntry = userRelation.voiceFriends.find(f => f.friendId === friendId);
  
  if (friendEntry) {
    friendEntry.totalTimeMs += durationMs;
    friendEntry.sessions += 1;
    if (!friendEntry.friendName && friendName) {
      friendEntry.friendName = friendName;
    }
  } else {
    userRelation.voiceFriends.push({
      friendId,
      friendName: friendName || '',
      totalTimeMs: durationMs,
      sessions: 1
    });
  }

  userRelation.voiceFriends.sort((a, b) => b.totalTimeMs - a.totalTimeMs);
  if (userRelation.voiceFriends.length > 20) {
    userRelation.voiceFriends = userRelation.voiceFriends.slice(0, 20);
  }

  await userRelation.save();
}

async function getUserFriends(userId, guildId) {
  const userRelation = await UserRelations.findOne({ userId, guildId });
  
  if (!userRelation) {
    return {
      voiceFriends: [],
      messageFriends: []
    };
  }

  return {
    voiceFriends: userRelation.voiceFriends
      .sort((a, b) => b.totalTimeMs - a.totalTimeMs)
      .slice(0, 6),
    messageFriends: userRelation.messageFriends
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 6)
  };
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}s ${m}d`;
}

export {
  updateMessageFriendship,
  updateVoiceFriendship,
  getUserFriends,
  formatDuration
};
