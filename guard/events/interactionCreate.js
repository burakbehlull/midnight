export default {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.slashCommands.get(interaction.commandName);
        
        if (!command) {
          return await interaction.reply({ 
            content: '❌ Bu komut bulunamadı!', 
            ephemeral: true 
          });
        }

        try {
          await command.execute(client, interaction);
        } catch (error) {
          console.error(`Slash komut hatası (${interaction.commandName}):`, error);
          
          const errorMessage = { 
            content: '❌ Komut çalıştırılırken bir hata oluştu!', 
            ephemeral: true 
          };
          
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage).catch(() => {});
          } else {
            await interaction.reply(errorMessage).catch(() => {});
          }
        }
      }
      
      else if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
        const guardCommand = client.prefixCommands.get('guard-panel');
        
        if (guardCommand && guardCommand.handleInteraction) {
          try {
            await guardCommand.handleInteraction(client, interaction);
          } catch (error) {
            if (error.code !== 10062) {
              console.error('Interaction hatası:', error);
            }
          }
        }
      }
      
    } catch (error) {
      if (error.code === 10062) {
        return; 
      }
      console.error('interactionCreate event hatası:', error);
    }
  }
};
