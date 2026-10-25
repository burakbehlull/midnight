import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder, MessageFlags } from 'discord.js';
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
        )
        .setIntegrationTypes([
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall
        ])
        .setContexts([
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel
        ]),
        
    async execute(client, interaction) {

        const manager = new Manager(client, { action: interaction })
        const ctrl = await manager.authority.checkOwnerAndBotOwners();

        if (!ctrl) return interaction.reply({ 
             content: '❌ Bu komutu kullanmak için yetkiniz yok.', 
            flags: MessageFlags.Ephemeral 
        });
        

        const mesaj = interaction.options.getString('mesaj');
		
        try {
            await interaction.reply({ content: mesaj });
        } catch (error) {
            console.error('Yaz slash komutu hatası:', error);
            await interaction.reply({ 
                content: '❌ Mesaj gönderilirken bir hata oluştu.', 
                flags: MessageFlags.Ephemeral 
            }).catch(() => {});
        }
    },
};
