import { 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder 
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('update')
        .setDescription('Plaats een officiële server- of bot-update in het changelogs kanaal.'),

    async execute(interaction, guildConfig, client) {
        // Maak de pop-up aan
        const modal = new ModalBuilder()
            .setCustomId('update_modal')
            .setTitle('Nieuwe Update Doorgeven');

        const titleInput = new TextInputBuilder()
            .setCustomId('update_title')
            .setLabel('Titel van de update')
            .setPlaceholder('Bijv: Bot Update v2.1 of Server Wijziging')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const changeInput = new TextInputBuilder()
            .setCustomId('update_changes')
            .setLabel('Wat is er veranderd? (Gebruik eventueel - )')
            .setPlaceholder('- /warn commando gefixt\n- Snelheid verbeterd\n- Pop-ups toegevoegd')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const versionInput = new TextInputBuilder()
            .setCustomId('update_version')
            .setLabel('Versie / Type (Optioneel)')
            .setPlaceholder('Bijv: v2.1.0 of SERVER UPDATE')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(changeInput),
            new ActionRowBuilder().addComponents(versionInput)
        );

        // Toon de pop-up aan de gebruiker
        await interaction.showModal(modal);

        // --- HIER GING HET MIS: WE VANGEN NU DE DATA NETJES OP ---
        try {
            const submitted = await interaction.awaitModalSubmit({
                time: 600000, // Gebruiker heeft 10 minuten om te typen
                filter: i => i.customId === 'update_modal' && i.user.id === interaction.user.id,
            });

            // Geef akkoord aan Discord dat we ermee bezig zijn
            await submitted.deferReply({ ephemeral: true });

            // Haal de ingevulde waarden op
            const titel = submitted.fields.getTextInputValue('update_title');
            const wijzigingen = submitted.fields.getTextInputValue('update_changes');
            const versie = submitted.fields.getTextInputValue('update_version') || 'Algemeen';

            // Zoek naar het changelogs kanaal
            const changelogChannel = interaction.guild.channels.cache.find(
                c => c.name.includes('changelog') || c.name.includes('updates')
            );

            if (!changelogChannel) {
                return await submitted.editReply({ 
                    content: '❌ Kon geen kanaal vinden met de naam `changelogs` of `updates`.' 
                });
            }

            // Maak een prachtig overzicht (Embed) voor je community
            const updateEmbed = new EmbedBuilder()
                .setTitle(`🚀 ${titel}`)
                .setColor('#00fbff')
                .addFields(
                    { name: '📌 Type / Versie', value: `\`${versie}\``, inline: true },
                    { name: '👤 Geplaatst door', value: `${interaction.user}`, inline: true },
                    { name: '📝 Wijzigingen', value: wijzigingen, inline: false }
                )
                .setFooter({ text: `NexSpace Updates`, iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            // Verzend het bericht naar het juiste kanaal
            await changelogChannel.send({ embeds: [updateEmbed] });

            // Bevestig privé aan de beheerder dat het gelukt is
            await submitted.editReply({ content: '✅ De update is succesvol geplaatst in het changelogs kanaal!' });

        } catch (err) {
            console.log('Update pop-up is gesloten of verlopen:', err.message);
        }
    }
};
