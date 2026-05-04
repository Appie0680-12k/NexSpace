import { EmbedBuilder } from 'discord.js';

// Instellingen
const WOORDSLANG_CHANNEL_NAME = 'woordslang'; // De naam van je kanaal

let lastWord = ""; // Begint leeg bij herstart
let lastUserId = null;

export default {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        // Stop als de bot zelf praat of als het niet in het juiste kanaal is
        if (message.author.bot) return;
        if (message.channel.name !== WOORDSLANG_CHANNEL_NAME) return;

        const currentWord = message.content.trim().toLowerCase();

        // 1. Check of het wel een enkel woord is (geen spaties)
        if (currentWord.split(/\s+/).length > 1) {
            return; // Bot negeert berichten met meerdere woorden
        }

        // 2. Check of de persoon niet twee keer achter elkaar gaat
        if (message.author.id === lastUserId) {
            const doubleEmbed = new EmbedBuilder()
                .setTitle('🚫 Wacht op je beurt!')
                .setDescription(`Je mag niet twee keer achter elkaar een woord sturen, ${message.author}!`)
                .setColor('#FF0000');

            const reply = await message.reply({ embeds: [doubleEmbed] });
            setTimeout(() => reply.delete().catch(() => {}), 5000); // Verwijder waarschuwing na 5 sec
            await message.react('❌');
            return;
        }

        // 3. Als er al een vorig woord was, check de laatste letter
        if (lastWord !== "") {
            const lastLetter = lastWord.slice(-1);
            const firstLetter = currentWord.charAt(0);

            if (firstLetter !== lastLetter) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Oei, foutje!')
                    .setDescription(`Jammer ${message.author}! Je woord **${currentWord}** begint niet met de laatste letter van **${lastWord}** (de letter **${lastLetter.toUpperCase()}**).`)
                    .setColor('#FF0000');

                await message.reply({ embeds: [errorEmbed] });
                await message.react('⚠️');
                return;
            }
        }

        // Als alles goed is:
        lastWord = currentWord;
        lastUserId = message.author.id;
        await message.react('✅');
    },
};
