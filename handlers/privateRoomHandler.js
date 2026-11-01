import { ChannelType, PermissionsBitField } from 'discord.js';
import { Room } from '#models';
import { Modal } from '#helpers';

const EMPTY_ROOM_DELETE_MS = 10000;
const emptyRoomTimers = new Map();

async function scheduleEmptyRoomCheck(channelId, guild) {
  const room = await Room.findOne({ guildId: guild.id, id: channelId });
  if (!room) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) {
    await Room.deleteOne({ guildId: guild.id, id: channelId });
    return;
  }
  if (channel.members.size > 0) return;
  if (emptyRoomTimers.has(channelId)) return;

  const timer = setTimeout(async () => {
    emptyRoomTimers.delete(channelId);
    try {
      const ch = guild.channels.cache.get(channelId);
      if (ch && ch.members.size > 0) return;

      await Room.deleteOne({ guildId: guild.id, id: channelId });
      if (ch) await ch.delete('Boş özel oda otomatik silindi').catch(() => {});
    } catch (error) {
      console.error('Boş oda silme hatası:', error);
    }
  }, EMPTY_ROOM_DELETE_MS);

  emptyRoomTimers.set(channelId, timer);
}

function cancelEmptyRoomCheck(channelId) {
  const timer = emptyRoomTimers.get(channelId);
  if (timer) {
    clearTimeout(timer);
    emptyRoomTimers.delete(channelId);
  }
}

export async function handleVoiceRoomCreate(oldState, newState) {
  const guild = newState?.guild ?? oldState?.guild;
  const member = newState?.member ?? oldState?.member;
  if (!guild || !member) return;

  try {
    const newChannel = newState.channel;
    const isCreateChannel =
      newChannel &&
      newChannel.type === ChannelType.GuildVoice &&
      newChannel.name.includes('Oluştur');

    if (isCreateChannel) {
      const room = await Room.findOne({ guildId: guild.id, ownerId: member.id });

      if (room) {
        const existingChannel = guild.channels.cache.get(room.id);
        if (existingChannel) {
          await member.voice.setChannel(existingChannel.id).catch(() => {});
          return;
        }
        await Room.deleteOne({ _id: room._id });
      }

      const cloned = await newChannel.clone({
        name: member.displayName,
        parent: newChannel.parent,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.ManageChannels
            ]
          }
        ]
      });

      await Room.create({
        id: cloned.id,
        ownerId: member.id,
        guildId: guild.id
      });

      await member.voice.setChannel(cloned.id).catch(() => {});
      return;
    }

    // 2) Bir özel odaya girildi
    if (newState?.channelId) {
      const isRoom = await Room.findOne({ guildId: guild.id, id: newState.channelId });
      if (isRoom) {
        // Odaya biri katıldıysa silme sayacını iptal et
        cancelEmptyRoomCheck(newState.channelId);

        if (member.id !== isRoom.ownerId) {
          const canConnect = newChannel
            ?.permissionsFor(member)
            ?.has(PermissionsBitField.Flags.Connect);

          if (!canConnect) {
            await member.voice
              .disconnect('Özel odaya izinsiz giriş')
              .catch(() => {});
          }
        }
      }
    }

    if (oldState?.channelId && oldState.channelId !== newState?.channelId) {
      await scheduleEmptyRoomCheck(oldState.channelId, guild);
    }
  } catch (error) {
    console.error('VoiceRoomCreate handler error:', error);
  }
}

export async function handleInteractionCreate(interaction) {
  try {
    if (interaction.isModalSubmit()) {
      const room = await Room.findOne({ ownerId: interaction.user.id });
      if (!room) return;

      const c = await interaction.guild.channels.fetch(room.id);

      if (interaction.customId === 'namemodal') {
        const roomname = interaction.fields.getTextInputValue('roomname');
        if (!roomname) return;
        await c.edit({ name: roomname });
        return await interaction.reply({content: `Oda adı: ${roomname} olarak ayarlandı!`, ephemeral: true});
      }

      if (interaction.customId === 'limitmodal') {
        const roomlimit = interaction.fields.getTextInputValue('roomlimit');
        if (!roomlimit) return;
        await c.edit({ userLimit: roomlimit });
        return await interaction.reply({content: `Oda limiti: ${roomlimit} olarak ayarlandı!`, ephemeral: true});
      }

      if (interaction.customId === 'adduserModal') {
        const roomuserid = interaction.fields.getTextInputValue('roomuserid');
        if (!roomuserid) return;
        const user = await interaction.guild.members.fetch(roomuserid);
        await c.permissionOverwrites.edit(user, { Connect: true });
	  return await interaction.reply({content: `<@${roomuserid}> kullanıcıya, ${c.name} adlı odaya girme izni verildi.`, ephemeral: true});
      }

      if (interaction.customId === 'deleteuserModal') {
        const roomuserid = interaction.fields.getTextInputValue('roomuserid');
        if (!roomuserid) return;
        const user = await interaction.guild.members.fetch(roomuserid);
        await c.permissionOverwrites.edit(user, { Connect: false });
        return await interaction.reply({content:`<@${roomuserid}> kullanıcının, ${c.name} adlı odaya girme izni alındı.`, ephemeral:true});
      }

      if (interaction.customId === 'kickuserModal') {
        const kickuserid = interaction.fields.getTextInputValue('kickuserid');
        if (!kickuserid) return;
        const user = await interaction.guild.members.fetch(kickuserid);
        if (user.voice.channelId !== c.id) return await c.send('Belirtilen kullanıcı bu kanalda değil.');
        await user.voice.setChannel(null);
        return await interaction.reply({content:`<@${kickuserid}> kullanıcı, ${c.name} adlı odadan atıldı!`, ephemeral: true});
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'roomnamebtn') {
        const modal = new Modal('namemodal', 'Oda Adı');
        modal.add('roomname', 'Oda Adı', { placeholder: 'room name' });
        return await interaction.showModal(modal.build());
      }

      if (interaction.customId === 'roomlimitbtn') {
        const modal = new Modal('limitmodal', 'Oda Limiti');
        modal.add('roomlimit', 'Oda Limiti', { placeholder: 'room limit' });
        return await interaction.showModal(modal.build());
      }

      if (interaction.customId === 'roomlockbtn') {
        const room = await Room.findOne({ ownerId: interaction.user.id });
        if (!room) return await interaction.reply({ content: 'Odanız yok!', ephemeral: true });
        const c = await interaction.guild.channels.fetch(room.id);
        const everyonePerms = c.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
        const isLocked = everyonePerms?.deny.has(PermissionsBitField.Flags.Connect);

        if (isLocked) {
          await c.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            Speak: true,
            Connect: true,
            ManageChannels: false,
            ManageRoles: false,
          });
          return await interaction.reply({content: `${c.name} adlı odanın kilidi açıldı!`, ephemeral: true});
        } else {
          await c.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            Speak: false,
            Connect: false,
            ManageChannels: false,
            ManageRoles: false,
          });
          return await interaction.reply({content: `${c.name} adlı oda kitlendi!`, ephemeral: true});
        }
      }

      if (interaction.customId === 'adduserbtn') {
        const modal = new Modal('adduserModal', 'Kullanıcı Ekle');
        modal.add('roomuserid', 'Kullanıcı Id', { placeholder: 'user id' });
        return await interaction.showModal(modal.build());
      }

      if (interaction.customId === 'deleteuserbtn') {
        const modal = new Modal('deleteuserModal', 'Kullanıcı Sil');
        modal.add('roomuserid', 'Kullanıcı Id', { placeholder: 'user id' });
        return await interaction.showModal(modal.build());
      }

      if (interaction.customId === 'kickuserbtn') {
        const modal = new Modal('kickuserModal', 'Atılacak Kullanıcı Id');
        modal.add('kickuserid', 'Kullanıcı Id', { placeholder: 'user id' });
        return await interaction.showModal(modal.build());
      }

      if (interaction.customId === 'roomdeletebtn') {
        const room = await Room.findOne({ ownerId: interaction.user.id });
        if (!room) return await interaction.reply({ content: 'Odanız yok!', ephemeral: true });
        const c = await interaction.guild.channels.fetch(room.id);
        await c.delete();
        await Room.deleteOne({ ownerId: interaction.user.id });
        return await interaction.reply({ content: `${c.name} adlı oda silindi!`, ephemeral: true });
      }
    }
  } catch (err) {
    console.error('InteractionCreate handler error:', err);
  }
}
