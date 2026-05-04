import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('eisen')
        .setDescription('Toont de officiële partnereisen van NexSpace'),

    async execute(interaction) {
        const eisenEmbed = new EmbedBuilder()
            .setTitle('🤝 NexSpace Partner Eisen')
            .setColor('#5865F2') // De blauwe kleur van je bot
            .setDescription('Wil jij een samenwerking aangaan met NexSpace? Lees de onderstaande regels goed door:')
            .addFields(
                { 
                    name: '📜 Regels & Voorwaarden', 
                    value: 
                    '• De server gaat akkoord met de **Discord TOS** regels.\n' +
                    '• Geen **NSFW** server.\n' +
                    '• Geen **scam** servers.\n' +
                    '• Je blijft minimaal **4 weken** in deze Discord, anders zal de samenwerking direct stoppen.' 
                },
                { 
                    name: '📢 Ping Eisen', 
                    value: 
                    '• **0 - 20 leden** = @Everyone ping.\n' +
                    '• **0 - 40 leden** = @Here ping.' 
                }
            )
            .addFields({ 
                name: '✅ Hoe nu verder?', 
                value: 'Ga je hier akkoord mee? Type dan ***Akkoord*** in dit ticket. Dan zullen we je verder helpen!' 
            })
            .setFooter({ text: 'NexSpace Community | Samen groeien' })
            .setTimestamp();

        await interaction.reply({ embeds: [eisenEmbed] });
    },
};
