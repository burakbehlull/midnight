import { ChannelType, PermissionsBitField } from 'discord.js';
import { Room } from '#models';
import { Modal } from '#helpers';

export async function handleVoiceRoomCreate(oldState, newState) {
  const createRoomChannelId = newState?.guild?.channels.cache.find(
    c => c.name.includes('Oluştur') && c.type === ChannelType.GuildVoice
  )?.id;

  if (!createRoomChannelId) return;

  try {
    if (newState.channelId === createRoomChannelId) {
      const existingRoom = await Room.findOne({
        guildId: newState.guild.id,
        ownerId: newState.member.id
      });
      if (existingRoom) return;

      const cloned = await newState.channel.clone({
        name: newState.member.displayName,
        parent: newState.channel.parent,
        permissionOverwrites: [
          {
            id: newState.member.id,
            allow: [
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.ManageChannels
            ]
          }
        ]
      });

      await Room.create({
        id: cloned.id,
        ownerId: newState.member.id,
        guildId: newState.guild.id
      });

      await newState.member.voice.setChannel(cloned.id);
    }

    if (oldState.channel && oldState.channel.members.size === 0) {
      const isRoom = await Room.findOne({
        guildId: oldState.guild.id,
        id: oldState.channelId
      });
      if (isRoom) {
        await oldState.channel.delete();
        await Room.deleteOne({
          guildId: oldState.guild.id,
          id: oldState.channelId
        });
      }
    }
  } catch (error) {
    console.error('VoiceRoomCreate handler error:', error);
  }
}

export async function handleInteractionCreate(interaction) {
  try {
    if (interaction.isModalSubmit()) {
      const room = await Room.findOne({ ownerId: interaction.user.id });
      if (!room) return await interaction.reply({ content: 'Odanız yok!', ephemeral: true });

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
        await c.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          Speak: false,
          Connect: false,
          ManageChannels: false,
          ManageRoles: false,
        });
        return await interaction.reply({content: `${c.name} adlı oda kitlendi!`, ephemeral: true});
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
