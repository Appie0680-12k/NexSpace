import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { gameState } from '../../events/guessNumberHandler.js'; 

export default {
    data: new SlashCommandBuilder()
        .setName('setgetal')
        .setDescription('Start een nieuw raad-het-getal spel')
        .addIntegerOption(option => 
            option.setName('getal')
                .setDescription('Het getal dat geraden moet worden')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const nieuwGetal = interaction.options.getInteger('getal');

        // Update de game state in de handler
        gameState.targetNumber = nieuwGetal;
        gameState.attempts = 0;
        gameState.active = true;

        const startEmbed = new EmbedBuilder()
            .setTitle('🎲 Nieuw Spel Gestart!')
            .setDescription(`Er is een nieuw getal ingesteld in <#${interaction.guild.channels.cache.find(c => c.name === 'raad-het-getal')?.id}>!\n\nBegin maar met raden!`)
            .setColor('#5865F2');

        await interaction.reply({ embeds: [startEmbed] });
    },
};
