import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('invites-lb')
        .setDescription('Bekijk de top 10 ultieme uitnodigers van de server!'),

    async execute(interaction) {
        const { client, guild } = interaction;

        try {
            await interaction.deferReply();

            // We halen alle invite data op uit de database voor deze server
            // Dit is een slimme manier om door de database keys te loopen
            const allData = await client.db.all?.() || []; 
            const serverInvites = [];

            // Filter alle keys die horen bij de invites van deze server
            for (const item of allData) {
                if (item.key && item.key.startsWith(`invites:${guild.id}:`)) {
                    const userId = item.key.split(':')[2];
                    const joins = item.value?.joins || 0;
                    const leaves = item.value?.leaves || 0;
                    const score = Math.max(0, joins - leaves);

                    if (score > 0) {
                        serverInvites.push({ userId, score, joins, leaves });
                    }
                }
            }

            // Sorteer op de hoogste netto score
            serverInvites.sort((a, b) => b.score - a.score);

            // Pak de top 10
            const top10 = serverInvites.slice(0, 10);

            const embed = new EmbedBuilder()
                .setColor('#FFD700') // Goudkleurig voor het leaderboard
                .setTitle(`🏆 INVITE LEADERBOARD - TOP 10`)
                .setDescription(`Wie heeft de meeste actieve leden binnengehaald in **${guild.name}**?\n\n`)
                .setFooter({ text: `Update live • NexSpace Engine` })
                .setTimestamp();

            if (top10.length === 0) {
                embed.setDescription('Er zijn nog geen statistieken bekend voor het leaderboard.');
            } else {
                let leaderboardText = "";
                const medailles = ['🥇', '🥈', '🥉', '🏅', '🏅', '🏅', '🏅', '🏅', '🏅', '🏅'];

                for (let i = 0; i < top10.length; i++) {
                    const entry = top10[i];
                    const member = await guild.members.fetch(entry.userId).catch(() => null);
                    const username = member ? member.user.username : `Onbekende Gebruiker (${entry.userId})`;
                    
                    leaderboardText += `${medailles[i]} **#${i + 1}** | ${username}\n` +
                                       `┗ 🔹 **${entry.score}** netto (📥 ${entry.joins} / 📤 ${entry.leaves})\n\n`;
                }
                embed.setDescription(leaderboardText);
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Er ging iets mis bij het laden van het leaderboard.' });
        }
    },
};
