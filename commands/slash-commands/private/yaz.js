import { SlashCommandBuilder } from 'discord.js';
import Manager from '#managers';


export default {
    data: new SlashCommandBuilder()
        .setName('yaz')
        .setDescription('Bot belirtilen mesajı yazar.')
        .addStringOption(option =>
            option
                .setName('mesaj')
                .setDescription('Yazılacak mesaj')
                .setRequired(true)
        ),

    async execute(client,interaction) {
        const mesaj = interaction.options.getString('mesaj');
		const manager = new Manager(client, { action: interaction });
	  
		const ctrl = await manager.authority.control()
		if (!ctrl) return message.reply('❌ Bu komutu kullanmak için yetkin yok.');
		
        try {
            await interaction.channel.send(mesaj);
            await interaction.reply({ content: 'Mesaj gönderildi.', ephemeral: true });
        } catch (error) {
            console.error('Yaz slash komutu hatası:', error);
            await interaction.reply({ content: '❌ Mesaj gönderilirken bir hata oluştu.', ephemeral: true });
        }
    },
};
