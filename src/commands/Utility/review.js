import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('review')
        .setDescription('Laat een officiële review achter voor MTS Shop'),

    async execute(interaction) {
        // Maak het pop-up venster (Modal)
        const modal = new ModalBuilder()
            .setCustomId('review_modal')
            .setTitle('MTS Shop - Schrijf een Review');

        // Vraag 1: Product
        const productInput = new TextInputBuilder()
            .setCustomId('review_product')
            .setLabel('Welk product heb je gekocht?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Bijv. Premium Account, In-game Currency...')
            .setRequired(true);

        // Vraag 2: Prijs
        const priceInput = new TextInputBuilder()
            .setCustomId('review_price')
            .setLabel('Wat was de prijs?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Bijv. €10,-')
            .setRequired(true);

        // Vraag 3: Legit check
        const legitInput = new TextInputBuilder()
            .setCustomId('review_legit')
            .setLabel('Is MTS Shop legit? (Ja / Nee)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ja, 100% legit!')
            .setRequired(true);

        // Vraag 4: Sterren beoordeling
        const starsInput = new TextInputBuilder()
            .setCustomId('review_stars')
            .setLabel('Sterren beoordeling (Kies: ⭐⭐⭐⭐⭐)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Bijv. ⭐⭐⭐⭐⭐')
            .setRequired(true);

        // Voeg de vragen toe aan het venster
        modal.addComponents(
            new ActionRowBuilder().addComponents(productInput),
            new ActionRowBuilder().addComponents(priceInput),
            new ActionRowBuilder().addComponents(legitInput),
            new ActionRowBuilder().addComponents(starsInput)
        );

        // Toon het venster aan de gebruiker
        await interaction.showModal(modal);
    }
};
