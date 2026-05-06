import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

// --- STYLING & NAMES ---
const SETTINGS = {
    PARTNER_CHANNEL: 'partners',     // Kanaal waar leden posten
    LOG_CHANNEL: 'partner-log',      // Kanaal voor de embed
    COLOR: '#00FFFF',                // Mooie nieuwe kleur (Cyaan/Neon)
    CURRENCY_SYMBOL: '€',
    PREFIX: '!'                      // Gebruik ! voor commando's
};

export default {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        // --- ADMIN COMMANDS ---
        if (message.content.startsWith(SETTINGS.PREFIX + 'nex')) {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

            const command = message.content.split(' ')[1];

            // !nex update -> Scant alles en ververst leaderboard
            if (command === 'update') {
                const wait = await message.reply('🔄 **NexSpace Engine:** Gegevens synchroniseren...');
                const stats = await scanPartners(message.guild);
                await refreshLeaderboard(message.guild, stats);
                return wait.edit('✅ **NexSpace Engine:** Leaderboard is volledig bijgewerkt!');
            }

            // !nex reset -> Gooit alles leeg
            if (command === 'reset') {
                await refreshLeaderboard(message.guild, {});
                return message.reply('🧹 **NexSpace Engine:** Alle statistieken zijn gewist.');
            }
        }

        // --- AUTOMATISCH LOGGEN ---
        if (message.channel.name === SETTINGS.PARTNER_CHANNEL) {
            const isLink = /discord\.(gg|com\/invite)\/\w+/i.test(message.content);
            if (isLink) {
                await message.react('💎').catch(() => {}); // Nieuwe reactie
                const stats = await scanPartners(message.guild);
                await refreshLeaderboard(message.guild, stats);
            }
        }
    }
};

async function scanPartners(guild) {
    const channel = guild.channels.cache.find(c => c.name === SETTINGS.PARTNER_CHANNEL);
    if (!channel) return {};

    const counts = {};
    const messages = await channel.messages.fetch({ limit: 100 });

    messages.forEach(msg => {
        if (!msg.author.bot && /discord\.(gg|com\/invite)\/\w+/i.test(msg.content)) {
            counts[msg.author.id] = (counts[msg.author.id] || 0) + 1;
        }
    });
    return counts;
}

async function refreshLeaderboard(guild, data) {
    const logChannel = guild.channels.cache.find(c => c.name === SETTINGS.LOG_CHANNEL);
    if (!logChannel) return;

    const sorted = Object.entries(data).sort(([, a], [, b]) => b - a);
    
    const embed = new EmbedBuilder()
        .setTitle('💎 NexSpace Elite Partners')
        .setColor(SETTINGS.COLOR)
        .setThumbnail(guild.iconURL())
        .setTimestamp();

    let list = "";
    if (sorted.length === 0) {
        list = "_Geen actieve partners gevonden in de scan._";
    } else {
        sorted.forEach(([id, count], i) => {
            const medal = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🔹';
            list += `${medal} <@${id}> — **${count}** partners (${SETTINGS.CURRENCY_SYMBOL}${count})\n`;
        });
    }

    embed.setDescription(`Dit zijn de huidige partner statistieken voor **${guild.name}**.\n\n${list}`);

    // Oude berichten opruimen zodat alleen de nieuwste bovenaan staat
    const oldMsgs = await logChannel.messages.fetch({ limit: 10 });
    const botMsgs = oldMsgs.filter(m => m.author.id === guild.members.me.id);
    if (botMsgs.size > 0) {
        await logChannel.bulkDelete(botMsgs).catch(() => {});
    }

    await logChannel.send({ embeds: [embed] });
}
