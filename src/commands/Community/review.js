import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('review')
        .setDescription('Laat een beoordeling achter voor de MTS Shop of NexSpace Shop!'),
    
    async execute(interaction) {
        // Stap 1: Selectiemenu voor de Shop
        const shopMenu = new StringSelectMenuBuilder()
            .setCustomId('review_select_shop')
            .setPlaceholder('Voor welke shop is de review?')
            .addOptions([
                { label: 'MTS Shop', value: 'mts', description: 'Review voor de MTS Shop', emoji: '🛒' },
                { label: 'NexSpace Shop', value: 'nexspace', description: 'Review voor de NexSpace Shop', emoji: '🚀' }
            ]);

        // Stap 2: Selectiemenu voor de Sterren (Klant klikt dit gewoon aan!)
        const starsMenu = new StringSelectMenuBuilder()
            .setCustomId('review_select_stars')
            .setPlaceholder('Hoeveel sterren geef je ons?')
            .addOptions([
                { label: '⭐ (1/5)', value: '⭐', description: 'Slecht' },
                { label: '⭐⭐ (2/5)', value: '⭐⭐', description: 'Matig' },
                { label: '⭐⭐⭐ (3/5)', value: '⭐⭐⭐', description: 'Voldoende' },
                { label: '⭐⭐⭐⭐ (4/5)', value: '⭐⭐⭐⭐', description: 'Goed!' },
                { label: '⭐⭐⭐⭐⭐ (5/5)', value: '⭐⭐⭐⭐⭐', description: 'Uitstekend!' }
            ]);

        const row1 = new ActionRowBuilder().addComponents(shopMenu);
        const row2 = new ActionRowBuilder().addComponents(starsMenu);

        // Stuur de menu's tijdelijk naar de gebruiker (alleen zichtbaar voor hem/haar)
        await interaction.reply({
            content: '✨ **MTS & NexSpace Review Systeem** ✨\nSelecteer hieronder de shop en je beoordeling om door te gaan:',
            components: [row1, row2],
            ephemeral: true
        });
    }
};
