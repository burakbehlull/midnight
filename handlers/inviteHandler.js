import { InviteModel, InviteCacheSchema, Settings } from '#models';
import { messageSender } from '#helpers'

const inviteHandler = async (client, member) => {
	const guild = member.guild;
	
	const settings = await Settings.findOne({ guildId: guild.id });
	
	
	if (!settings || !settings.inviteLogStatus) return;
	
	const sender = new messageSender(member);

	let inviter = null;
	let usedInviteCode = null;
	
	try {
		const newInvites = await guild.invites.fetch();

		for (const [code, invite] of newInvites) {
			const cached = await InviteCacheSchema.findOne({ guildId: guild.id, code });

			if (cached && invite.uses > cached.uses) {
				inviter = invite.inviter;
				usedInviteCode = code;

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
	} catch (err) {
		console.error('[InviteHandler] Davetler kontrol edilemedi:', err);
	}

	
	if (inviter) {
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

	
	if (settings.inviteLogChannelId) {
		const channel = guild.channels.cache.get(settings.inviteLogChannelId);
		if (channel) {
			let description = '';
			if (!inviter) {
				description = `<@${member.user.id}>, **özel URL** veya **keşfet** ile giriş yaptı.`;
			} else {
				const inviterMember = await guild.members.fetch(inviter.id).catch(() => null);
				const inviterTag = inviterMember ? inviterMember.user.tag : inviter.tag;
				
				description = `<@${member.user.id}>, <@${inviter.id}> (**${inviterTag}**) tarafından davet edildi.`;
			}

			const embed = sender.embed({
				author: { name: member.guild.name, iconURL: member.guild.iconURL() },
				title: '📥 Yeni Üye Katıldı',
				description: description,
				color: 'Green',
				footer: { text: `Toplam üye: ${guild.memberCount}`, iconURL: member.user.displayAvatarURL() }
			});

			await channel.send({ embeds: [embed] }).catch(err => {
				console.error('[InviteHandler] Log kanalına mesaj gönderilemedi:', err);
			});
		}
	}
};

export default inviteHandler;
