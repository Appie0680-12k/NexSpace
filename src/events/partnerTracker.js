import { EmbedBuilder } from 'discord.js';

// --- CONFIGURATIE ---
const PARTNER_CHANNEL_NAME = 'partners';    // Waar leden de partners posten
const LOG_CHANNEL_NAME = 'partner-log';     // Waar het leaderboard komt
const EURO_PER_PARTNER = 1;                 // Hoeveel ze verdienen per partner
// --------------------

let partnerData = {}; // Dit houdt de scores bij { userId: score }
let leaderboardMessageId = null;

export default {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        if (message.author.bot) return;

        // 1. Check of het bericht in het #partners kanaal is
        if (message.channel.name === PARTNER_CHANNEL_NAME) {
            const userId = message.author.id;

            // Punt toevoegen
            partnerData[userId] = (partnerData[userId] || 0) + 1;

            // Bevestiging met emoji
            await message.react('💰');

            // 2. Leaderboard updaten in #partner-log
            await updateLeaderboard(message.guild);
        }
    },
};

async function updateLeaderboard(guild) {
    const logChannel = guild.channels.cache.find(c => c.name === LOG_CHANNEL_NAME);
    if (!logChannel) return console.log("Log kanaal niet gevonden!");

    // Data sorteren van hoog naar laag
    const sortedArray = Object.entries(partnerData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Top 10

    let description = "Wie heeft de meeste partners geregeld?\nElke partner is **€1,-** waard! 💸\n\n";

    if (sortedArray.length === 0) {
        description += "_Nog geen partners geregeld..._";
    } else {
        sortedArray.forEach(([id, score], index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
            description += `${medal} <@${id}>: **${score} partners** (Verdiend: €${score * EURO_PER_PARTNER})\n`;
        });
    }

    const leaderboardEmbed = new EmbedBuilder()
        .setTitle('🏆 NexSpace Partner Leaderboard')
        .setDescription(description)
        .setColor('#F1C40F')
        .setThumbnail(guild.iconURL())
        .setFooter({ text: 'NexSpace Economy • Wordt automatisch geüpdatet' })
        .setTimestamp();

    // Als we al een bericht hebben gestuurd, bewerk (edit) die dan
    if (leaderboardMessageId) {
        try {
            const msg = await logChannel.messages.fetch(leaderboardMessageId);
            await msg.edit({ embeds: [leaderboardEmbed] });
        } catch (e) {
            // Als het bericht verwijderd is, stuur een nieuwe
            const newMsg = await logChannel.send({ embeds: [leaderboardEmbed] });
            leaderboardMessageId = newMsg.id;
        }
    } else {
        // Eerste keer het leaderboard sturen
        const newMsg = await logChannel.send({ embeds: [leaderboardEmbed] });
        leaderboardMessageId = newMsg.id;
    }
}
