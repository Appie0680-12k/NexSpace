import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Geef een stafflid een officiële waarschuwing of ontslag.')
        .addUserOption(option => 
            option.setName('gebruiker')
                .setDescription('Het stafflid dat de waarschuwing krijgt')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('gebruiker');

        const modal = new ModalBuilder()
            .setCustomId(`warn_modal:${targetUser.id}`)
            .setTitle(`Sanctie voor ${targetUser.username}`);

        const typeInput = new TextInputBuilder()
            .setCustomId('warn_type')
            .setLabel('Type sanctie (Typ: 1e warn / 2e ontslag / direct ontslag)')
            .setPlaceholder('Bijv: 1e warn')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('warn_reason')
            .setLabel('Reden')
            .setPlaceholder('Waarom krijgt dit stafflid deze sanctie?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const noteInput = new TextInputBuilder()
            .setCustomId('warn_note')
            .setLabel('Opmerking')
            .setPlaceholder('Eventuele extra opmerkingen (optioneel)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(typeInput),
            new ActionRowBuilder().addComponents(reasonInput),
            new ActionRowBuilder().addComponents(noteInput)
        );

        await interaction.showModal(modal);
    }
};
