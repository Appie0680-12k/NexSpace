import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setup-gpt')
        .setDescription('Spawnt het Space-GPT AI paneel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // We antwoorden DIRECT aan Discord om de 3-seconden timeout en de 'Unexpected Error' te voorkomen
        await interaction.deferReply({ ephemeral: true });

        try {
            const embed = new EmbedBuilder()
                .setTitle('🧠 NexSpace Intelligence Portal')
                .setDescription('Klik op de onderstaande knop om een beveiligde privé-sessie met **Space-GPT** te starten. Stel vragen, analyseer documenten of genereer afbeeldingen.')
                .setColor('#00fbff')
                .setFooter({ text: 'NexSpace Premium AI Services' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('start_gpt_session')
                    .setLabel('Start Privé AI Chat')
                    .setEmoji('🤖')
                    .setStyle(ButtonStyle.Premium)
            );

            // Stuur het paneel los in het kanaal
            await interaction.channel.send({ embeds: [embed], components: [row] });
            
            // Bevestig onzichtbaar aan de admin dat het gelukt is
            return await interaction.editReply({ content: '✅ Space-GPT Paneel succesvol geplaatst!' });

        } catch (error) {
            console.error('Fout tijdens setup-gpt commando:', error);
            return await interaction.editReply({ content: '❌ Er ging iets mis in de code bij het plaatsen van het paneel.' });
        }
    }
};
