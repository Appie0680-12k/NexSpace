import { EmbedBuilder } from 'discord.js';

// We slaan het tijdelijk op in het geheugen
let partnerData = {}; 

const CONFIG = {
    PARTNER_CHANNEL: 'partners',
    LOG_CHANNEL: 'partner-log',
    EURO: 1
};

export default [
    {
        name: 'messageCreate',
        async execute(message) {
            if (message.author.bot) return;

            // DEBUG: Dit MOET je in je Railway logs zien als je iets typt
            console.log(`[CHECK] Bericht in: ${message.channel.name}`);

            if (message.channel.name === CONFIG.PARTNER_CHANNEL) {
                if (/discord\.(gg|com\/invite)\/\w+/i.test(message.content)) {
                    const uid = message.author.id;
                    partnerData[uid] = (partnerData[uid] || 0) + 1;
                    
                    await message.react('💰').catch(() => console.log("Reactie mislukt"));
                    await updateLeaderboard(message.guild);
                }
            }
        }
    },
    {
        name: 'interactionCreate',
        async execute(interaction) {
            if (!interaction.isChatInputCommand() || interaction.commandName !== 'partneradmin') return;
            if (!interaction.member.permissions.has('Administrator')) return interaction.reply({ content: 'Geen admin', ephemeral: true });

            const sub = interaction.options.getSubcommand();

            if (sub === 'update') {
                await interaction.reply({ content: 'Aan de slag...', ephemeral: true });
                await fullScan(interaction.guild);
                await interaction.editReply('Klaar.');
            }

            if (sub === 'reset') {
                partnerData = {};
                await updateLeaderboard(interaction.guild);
                await interaction.reply('Reset voltooid.');
            }
        }
    }
];

async function updateLeaderboard(guild) {
    const chan = guild.channels.cache.find(c => c.name === CONFIG.LOG_CHANNEL);
    if (!chan) return console.log("Log kanaal niet gevonden");

    const sorted = Object.entries(partnerData).sort(([, a], [, b]) => b - a).slice(0, 15);
    let desc = "### 🏆 Leaderboard\n";
    
    if (sorted.length === 0) desc += "Leeg...";
    else sorted.forEach(([id, s], i) => {
        desc += `${i+1}. <@${id}>: **${s}** (€${s * CONFIG.EURO})\n`;
    });

    const embed = new EmbedBuilder().setDescription(desc).setColor('#F1C40F');
    const msgs = await chan.messages.fetch({ limit: 5 });
    const old = msgs.find(m => m.author.id === guild.members.me.id);
    
    if (old) await old.edit({ embeds: [embed] });
    else await chan.send({ embeds: [embed] });
}

async function fullScan(guild) {
    const chan = guild.channels.cache.find(c => c.name === CONFIG.PARTNER_CHANNEL);
    if (!chan) return;
    partnerData = {};
    let messages = await chan.messages.fetch({ limit: 100 });
    messages.forEach(m => {
        if (!m.author.bot && /discord\.(gg|com\/invite)\/\w+/i.test(m.content)) {
            partnerData[m.author.id] = (partnerData[m.author.id] || 0) + 1;
        }
    });
    await updateLeaderboard(guild);
}
