import { EmbedBuilder } from 'discord.js';

// Instellingen
const COUNTING_CHANNEL_NAME = 'tellen'; // De naam van je kanaal

let currentCount = 0;
let lastUserId = null;

export default {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        // Stop als de bot zelf praat of als het niet in het juiste kanaal is
        if (message.author.bot) return;
        if (message.channel.name !== COUNTING_CHANNEL_NAME) return;

        const content = message.content.trim();
        const number = parseInt(content);

        // Check of het bericht alleen een getal is
        if (isNaN(number) || !/^\d+$/.test(content)) {
            // Optioneel: verwijder berichten die geen getallen zijn om het kanaal schoon te houden
            // await message.delete(); 
            return;
        }

        // 1. Check of het getal wel de volgende in de rij is
        if (number !== currentCount + 1) {
            currentCount = 0;
            lastUserId = null;
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Oei, foutje!')
                .setDescription(`Jammer ${message.author}! **${number}** was niet het juiste getal. We moesten naar de **${currentCount + 1}**.\n\nWe beginnen weer bij **1**!`)
                .setColor('#FF0000');
            
            await message.reply({ embeds: [errorEmbed] });
            await message.react('⚠️');
            return;
        }

        // 2. Check of dezelfde persoon niet twee keer achter elkaar typt
        if (message.author.id === lastUserId) {
            currentCount = 0;
            lastUserId = null;

            const doubleEmbed = new EmbedBuilder()
                .setTitle('🚫 Niet valsspelen!')
                .setDescription(`Je mag niet twee keer achter elkaar tellen, ${message.author}!\n\nWe beginnen weer bij **1**!`)
                .setColor('#FF0000');

            await message.reply({ embeds: [doubleEmbed] });
            await message.react('❌');
            return;
        }

        // Als alles goed is:
        currentCount = number;
        lastUserId = message.author.id;
        await message.react('✅');
    },
};
