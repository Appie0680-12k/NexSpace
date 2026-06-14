import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setup-sollicitatie')
        .setDescription('Plaats het sollicitatie instroombericht in het huidige kanaal'),
        
    async execute(interaction) {
        // Alleen mensen met Administrator permissie mogen dit paneel plaatsen
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ Jij hebt geen toestemming om dit paneel te plaatsen!', flags: ['Ephemeral'] });
        }

        // De layout van het bericht dat in #┃🔖・informatie komt te staan
        const embed = new EmbedBuilder()
            .setTitle('💼 NexSpace / MTS Sollicitaties')
            .setDescription('Wil jij ons team komen versterken? Klik op een van de onderstaande knoppen om je sollicitatiegesprek direct in je DM te starten!')
            .setColor('#00fbff')
            .setFooter({ text: 'Bot developer: Klapstoel' });

        // De twee knoppen onder het bericht
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('start_apply_regulier')
                .setLabel('Solliciteer voor Staff')
                .setStyle(ButtonStyle.Success), // Groene knop
            new ButtonBuilder()
                .setCustomId('start_apply_management')
                .setLabel('Solliciteer voor Management')
                .setStyle(ButtonStyle.Primary) // Blauwe knop
        );

        // Stuur het bericht in het kanaal waar het commando wordt getypt
        await interaction.channel.send({ embeds: [embed], components: [row] });
        
        return interaction.reply({ content: '✅ Sollicitatiepaneel succesvol geplaatst!', flags: ['Ephemeral'] });
    }
};
