import { EmbedBuilder } from 'discord.js';

// --- CONFIGURATIE ---
const PARTNER_CHANNEL_NAME = 'partners';
const LOG_CHANNEL_NAME = 'partner-log';
const EURO_PER_PARTNER = 1;

export let partnerData = {}; 

// Functie om de hele geschiedenis van het kanaal te lezen
async function fetchAllPartners(guild) {
    const partnerChannel = guild.channels.cache.find(c => c.name === PARTNER_CHANNEL_NAME);
    if (!partnerChannel) return console.log("⚠️ #partners kanaal niet gevonden tijdens scan.");

    console.log(`🔍 Bezig met scannen van geschiedenis in #${PARTNER_CHANNEL_NAME}...`);
    
    // Reset data voor een schone scan
    for (let member in partnerData) delete partnerData[member];

    let lastId;
    while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const messages = await partnerChannel.messages.fetch(options);
        if (messages.size === 0) break;

        messages.forEach(msg => {
            const hasInvite = /discord\.(gg|com\/invite)\/\w+/i.test(msg.content);
            if (!msg.author.bot && hasInvite) {
                partnerData[msg.author.id] = (partnerData[msg.author.id] || 0) + 1;
            }
        });

        lastId = messages.last().id;
        if (messages.size < 100) break;
    }
    
    console.log("✅ Scan voltooid. Leaderboard updaten...");
    await updateLeaderboard(guild);
}

export default [
    {
        name: 'ready',
        once: true,
        async execute(client) {
            console.log(`🚀 ${client.user.tag} is online.`);
            // Scan direct alle servers waar de bot in zit bij opstarten
            client.guilds.cache.forEach(guild => fetchAllPartners(guild));
        }
    },
    {
        name: 'messageCreate',
        once: false,
        async execute(message) {
            if (message.author.bot) return;

            if (message.channel.name === PARTNER_CHANNEL_NAME) {
                const hasInvite = /discord\.(gg|com\/invite)\/\w+/i.test(message.content);
                if (hasInvite) {
                    partnerData[message.author.id] = (partnerData[message.author.id] || 0) + 1;
                    await message.react('💰');
                    await updateLeaderboard(message.guild);
                }
            }
        }
    }
];

export async function updateLeaderboard(guild) {
    const logChannel = guild.channels.cache.find(c => c.name === LOG_CHANNEL_NAME);
    if (!logChannel) return;

    const sortedArray = Object.entries(partnerData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15);

    let description = "### 🏆 NexSpace Partner Leaderboard\n" +
                      "Elke geregelde partner is **€1,-** waard! 💸\n\n";

    if (sortedArray.length === 0) {
        description += "_Nog geen partners gevonden in de geschiedenis..._";
    } else {
        sortedArray.forEach(([id, score], index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
            description += `${medal} <@${id}>: **${score} partners** (Totaal: €${score * EURO_PER_PARTNER})\n`;
        });
    }

    const leaderboardEmbed = new EmbedBuilder()
        .setDescription(description)
        .setColor('#F1C40F')
        .setThumbnail(guild.iconURL())
        .setFooter({ text: 'NexSpace Economy • Updates automatisch via kanaal-scan' })
        .setTimestamp();

    // Zoek het vorige bericht van de bot om dubbele berichten te voorkomen
    const lastMessages = await logChannel.messages.fetch({ limit: 10 });
    const botMsg = lastMessages.find(m => m.author.id === guild.members.me.id);
    
    if (botMsg) {
        await botMsg.edit({ embeds: [leaderboardEmbed] });
    } else {
        await logChannel.send({ embeds: [leaderboardEmbed] });
    }
}
