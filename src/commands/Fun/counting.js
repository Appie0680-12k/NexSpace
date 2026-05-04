import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

// Let op: In een echte bot zou je de score in een database opslaan. 
// Voor nu houden we het simpel met een variabele (die reset bij een herstart).
let currentCount = 0;
let lastUser = null;

export default {
    data: new SlashCommandBuilder()
        .setName('tel')
        .setDescription('Doe mee met het telspel!')
        .addIntegerOption(option => 
            option.setName('getal')
                .setDescription('Het volgende getal in de rij')
                .setRequired(true)),

    async execute(interaction) {
        const getal = interaction.options.getInteger('getal');
        const user = interaction.user.id;

        if (getal !== currentCount + 1) {
            currentCount = 0; // Reset bij fout
            lastUser = null;
            return interaction.reply(`❌ Oeps! **${interaction.user.username}** typte het verkeerde getal. We beginnen weer bij **1**!`);
        }

        if (user === lastUser) {
            currentCount = 0;
            lastUser = null;
            return interaction.reply(`❌ Je mag niet twee keer achter elkaar tellen, **${interaction.user.username}**! We beginnen weer bij **1**!`);
        }

        currentCount = getal;
        lastUser = user;
        await interaction.reply(`✅ **${getal}**! Wie typt de **${currentCount + 1}**?`);
    },
};
