import { EmbedBuilder } from 'discord.js';

// We exporteren deze variabelen zodat het commando ze kan aanpassen
export let gameState = {
    targetNumber: null,
    attempts: 0,
    active: false
};

// De exacte naam van jouw kanaal inclusief de emoji's
const GUESS_CHANNEL_NAME = '┃🎁・raad-het-getal';

export default {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        // Stop als het een bot is, of als er geen spel actief is
        if (message.author.bot || !gameState.active) return;
        
        // Exacte check op de kanaalnaam met emoji's
        if (message.channel.name !== GUESS_CHANNEL_NAME) return;

        const guess = parseInt(message.content.trim());
        // Als het geen geldig getal is, negeer het bericht
        if (isNaN(guess)) return;

        gameState.attempts++;

        if (guess === gameState.targetNumber) {
            const winEmbed = new EmbedBuilder()
                .setTitle('🎉 GEWONNEN!')
                .setDescription(`Gefeliciteerd ${message.author}! Je hebt het getal **${gameState.targetNumber}** geraden in **${gameState.attempts}** beurten.`)
                .setColor('#00FF00')
                .setFooter({ text: 'Het spel is nu afgelopen. Een admin moet een nieuw getal starten.' });

            await message.reply({ embeds: [winEmbed] });
            await message.react('🏆');

            // Stop het spel en zet alles terug op de beginwaarden
            gameState.active = false;
            gameState.targetNumber = null;
            gameState.attempts = 0;
        } else if (guess < gameState.targetNumber) {
            await message.react('⬆️');
        } else {
            await message.react('⬇️');
        }
    },
};
