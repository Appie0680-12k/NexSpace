import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setup-shop')
        .setDescription('Plaats het MTS Shop aankoop paneel.'),
    
    async execute(interaction) {
        // Handmatige admin check zodat de registratie bij Discord nooit faalt
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.reply({ 
                content: '❌ Jij hebt geen toestemming (Administrator) om dit commando te gebruiken!', 
                ephemeral: true 
            });
        }

        // Geef een onzichtbare laad-status aan de gebruiker
        await interaction.deferReply({ ephemeral: true });

        try {
            const embed = new EmbedBuilder()
                .setTitle('🛒 MTS SHOP AANKOPEN')
                .setDescription('Wil je iets kopen uit de prijzenlijst? Klik op de onderstaande knop om een aankoop ticket te openen!\n\n*Misbruik van tickets is strafbaar.*')
                .setColor('#00fbff')
                .setFooter({ text: 'MTS Shop • Altijd veilig en snel' });

            const button = new ButtonBuilder()
                .setCustomId('open_purchase_ticket')
                .setLabel('🛒 Koop Nu')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(button);

            // Stuur het paneel in het huidige kanaal
            await interaction.channel.send({ embeds: [embed], components: [row] });
            
            // Bevestig succesvol aan de admin
            await interaction.editReply({ content: '✅ Het shop-paneel is succesvol geplaatst!' });
        } catch (error) {
            console.error('Fout bij het plaatsen van het shop-paneel:', error);
            await interaction.editReply({ content: '❌ Er ging iets fout bij het plaatsen van het paneel.' });
        }
    }
};
