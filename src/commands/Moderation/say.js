import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Laat de bot een bericht namens jou sturen')
        .addStringOption(option =>
            option.setName('bericht')
                .setDescription('De tekst die de bot moet zeggen')
                .setRequired(true))
        // Hiermee zorg je dat alleen Administrators het commando kunnen zien/gebruiken
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const bericht = interaction.options.getString('bericht');

        // De bot stuurt het bericht in het kanaal
        await interaction.channel.send(bericht);

        // De bot geeft een bevestiging die ALLEEN de moderator ziet
        // Dit zorgt ervoor dat de "aanroep" van het commando onzichtbaar blijft voor anderen
        await interaction.reply({ content: 'Bericht is verzonden!', ephemeral: true });
    },
};
