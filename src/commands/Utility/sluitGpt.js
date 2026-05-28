import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('sluitgpt')
        .setDescription('Sluit deze actieve Space-GPT AI-sessie en verwijdert het kanaal'),

    async execute(interaction) {
        const channel = interaction.channel;

        // 1. Controleer of de gebruiker dit wel in een gpt-kanaal typt
        if (!channel.name?.startsWith('gpt-')) {
            return await interaction.reply({ 
                content: '❌ Dit commando kan alleen binnen een actieve `#gpt-` privésessie worden gebruikt.', 
                ephemeral: true 
            });
        }

        // 2. Controleer wie het commando typt (de maker van de chat óf een admin)
        const isChannelOwner = channel.name === `gpt-${interaction.user.username}`.toLowerCase();
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isChannelOwner && !isAdmin) {
            return await interaction.reply({ 
                content: '❌ Alleen de starter van deze AI-sessie of een Administrator kan dit kanaal sluiten.', 
                ephemeral: true 
            });
        }

        // 3. Direct reageren om Discord timeouts te voorkomen en aftellen starten
        await interaction.reply({ 
            content: '🔒 *Deze AI-sessie wordt nu afgesloten. Dit kanaal wordt over 5 seconden definitief verwijderd...*' 
        });

        // Wacht 5 seconden en gooi het kanaal weg
        setTimeout(async () => {
            try {
                await channel.delete();
            } catch (error) {
                console.error('Fout bij het verwijderen van het gpt-kanaal:', error);
            }
        }, 5000);
    }
};
