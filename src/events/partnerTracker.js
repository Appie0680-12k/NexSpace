import { EmbedBuilder } from 'discord.js';

// --- CONFIGURATIE ---
const PARTNER_CHANNEL_NAME = 'partners';    // Kanaal waar partners worden gepost
const LOG_CHANNEL_NAME = 'partner-log';     // Kanaal voor het leaderboard
const EURO_PER_PARTNER = 1;                 // Beloning per partner

export let partnerData = {}; 
export let leaderboardMessageId = null;

export default {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        if (message.author.bot) return;

        // Check of het bericht in het juiste kanaal is
        if (message.channel.name === PARTNER_CHANNEL_NAME) {
            
            // BEVEILIGING: Alleen tellen als er een Discord invite link in staat
            const hasInvite = /discord\.(gg|com\/invite)\/\w+/i.test(message.content);
            
            if (!hasInvite) {
                // Optioneel: stuur een privébericht of negeer het bericht
                return; 
            }

            const userId = message.author.id;
            partnerData[userId] = (partnerData[userId] || 0) + 1;
            
            await message.react('💰');
            await updateLeaderboard(message.guild);
        }
    },
};

// Functie om het leaderboard te bouwen en te updaten
export async function updateLeaderboard(guild) {
    const logChannel = guild.channels.cache.find(c => c.name === LOG_CHANNEL_NAME);
    if (!logChannel) return;

    const sortedArray = Object.entries(partnerData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15);

    let description = "Wie heeft de meeste partners geregeld?\nElke partner is **€1,-** waard! 💸\n\n";

    if (sortedArray.length === 0) {
        description += "_Nog geen partners gelogd..._";
    } else {
        sortedArray.forEach(([id, score], index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
            description += `${medal} <@${id}>: **${score} partners** (Totaal: €${score * EURO_PER_PARTNER})\n`;
        });
    }

    const leaderboardEmbed = new EmbedBuilder()
        .setTitle('🏆 NexSpace Partner Leaderboard')
        .setDescription(description)
        .setColor('#F1C40F')
        .setThumbnail(guild.iconURL())
        .setFooter({ text: 'NexSpace Economy • Gebruik /partneradmin update voor scan' })
        .setTimestamp();

    if (leaderboardMessageId) {
        try {
            const msg = await logChannel.messages.fetch(leaderboardMessageId);
            await msg.edit({ embeds: [leaderboardEmbed] });
        } catch (e) {
            const newMsg = await logChannel.send({ embeds: [leaderboardEmbed] });
            leaderboardMessageId = newMsg.id;
        }
    } else {
        const newMsg = await logChannel.send({ embeds: [leaderboardEmbed] });
        leaderboardMessageId = newMsg.id;
    }
}

export function resetPartnerData() {
    partnerData = {};
}
