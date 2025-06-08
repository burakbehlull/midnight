import { EmbedBuilder } from 'discord.js';
import { InviteModel, InviteCacheSchema } from '#models';
import { messageSender } from '#helpers' 
const CHANNEL_ID = '946118868290646077';

const inviteHandler = async (client, member) => {
  const guild = member.guild;
  const sender = new messageSender(member)

  let inviter = null;
  const newInvites = await guild.invites.fetch();

  for (const [code, invite] of newInvites) {
    const cached = await InviteCacheSchema.findOne({ guildId: guild.id, code });

    if (cached && invite.uses > cached.uses) {
      inviter = invite.inviter;

      cached.uses = invite.uses;
      await cached.save();
      break;
    }
  }

  for (const [code, invite] of newInvites) {
    await InviteCacheSchema.findOneAndUpdate(
      { guildId: guild.id, code },
      {
        inviterId: invite.inviter?.id || 'unknown',
        uses: invite.uses
      },
      { upsert: true }
    );
  }

  const channel = guild.channels.cache.get(CHANNEL_ID);
  if (!channel) return console.error('Davet log kanalı bulunamadı.');

  let description = '';
  if (!inviter) {
    description = `<@${member.user.id}>, \`özel URL\` kullanarak giriş yaptı.`;
  } else {
    description = `<@${member.user.id}>, \`${inviter.tag}\` davetiyle giriş yaptı.`;

    const existing = await InviteModel.findOne({ guildId: guild.id, userId: inviter.id });
    if (existing) {
      existing.invitesCount++;
      await existing.save();
    } else {
      await InviteModel.create({
        guildId: guild.id,
        userId: inviter.id,
        invitesCount: 1
      });
    }
  }

  const embed = sender.embed({
	author: { name: member.guild.name, iconURL: member.guild.iconURL()},
	title: null,
	description: description,
	color: 'Green'
  })

  await channel.send({ embeds: [embed] });
};

export default inviteHandler;
