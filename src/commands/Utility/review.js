import {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('review')
        .setDescription('Maak een review voor MTS Shop'),

    async execute(interaction) {

        const modal = new ModalBuilder()
            .setCustomId('reviewModal')
            .setTitle('⭐ MTS Shop Review');

        const product = new TextInputBuilder()
            .setCustomId('product')
            .setLabel('Welk product heb je gekocht?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const prijs = new TextInputBuilder()
            .setCustomId('prijs')
            .setLabel('Wat was de prijs?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const legit = new TextInputBuilder()
            .setCustomId('legit')
            .setLabel('Was het legit?')
            .setPlaceholder('Ja / Nee')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const sterren = new TextInputBuilder()
            .setCustomId('sterren')
            .setLabel('Sterren beoordeling (1-5)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const bericht = new TextInputBuilder()
            .setCustomId('bericht')
            .setLabel('Extra bericht')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(product),
            new ActionRowBuilder().addComponents(prijs),
            new ActionRowBuilder().addComponents(legit),
            new ActionRowBuilder().addComponents(sterren),
            new ActionRowBuilder().addComponents(bericht)
        );

        await interaction.showModal(modal);
    }
};
