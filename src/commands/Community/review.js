import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('review')
        .setDescription('Laat een beoordeling achter voor de MTS Shop!'),
    
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('review_modal')
            .setTitle('MTS Shop Review');

        const productInput = new TextInputBuilder()
            .setCustomId('review_product')
            .setLabel('Wat heb je gekocht?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Bijv. Starter Pack, Munten, Custom Rol...')
            .setRequired(true);

        const priceInput = new TextInputBuilder()
            .setCustomId('review_price')
            .setLabel('Wat was de prijs?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Bijv. €5,00 of 500 munten')
            .setRequired(true);

        const legitInput = new TextInputBuilder()
            .setCustomId('review_legit')
            .setLabel('Is de shop legitiem en eerlijk verlopen?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Bijv. Ja, heel snel geholpen!')
            .setRequired(true);

        const starsInput = new TextInputBuilder()
            .setCustomId('review_stars')
            .setLabel('Hoeveel sterren geef je ons? (1-5)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Bijv. ⭐⭐⭐⭐⭐')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(productInput),
            new ActionRowBuilder().addComponents(priceInput),
            new ActionRowBuilder().addComponents(legitInput),
            new ActionRowBuilder().addComponents(starsInput)
        );

        await interaction.showModal(modal);
    }
};
