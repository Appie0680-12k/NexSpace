import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { partnerData, updateLeaderboard, resetPartnerData } from '../../events/partnerTracker.js';

export default {
    data: new SlashCommandBuilder()
        .setName('partneradmin')
        .setDescription('Beheer het partner leaderboard (Alleen Admins)')
        .addSubcommand(subcommand =>
            subcommand.setName('update')
                .setDescription('Scant het kanaal en telt alle oude partner-berichten opnieuw op'))
        .addSubcommand(subcommand =>
            subcommand.setName('reset')
                .setDescription('Zet alle scores op 0 na een uitbetaling'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'update') {
            await interaction.deferReply({ ephemeral: true });
            const partnerChannel = interaction.guild.channels.cache.find(c => c.name === 'partners');
            
            if (!partnerChannel) return interaction.editReply("Fout: Kanaal `#partners` niet gevonden.");

            // Data leegmaken voor een schone scan
            resetPartnerData();

            let lastId;
            let totalFetched = 0;

            // Haal alle berichten op uit het kanaal (loopt door tot alles binnen is)
            while (true) {
                const options = { limit: 100 };
                if (lastId) options.before = lastId;

                const messages = await partnerChannel.messages.fetch(options);
                if (messages.size === 0) break;

                messages.forEach(msg => {
                    // Alleen tellen als het geen bot is EN er een Discord link in staat
                    const hasInvite = /discord\.(gg|com\/invite)\/\w+/i.test(msg.content);
                    if (!msg.author.bot && hasInvite) {
                        partnerData[msg.author.id] = (partnerData[msg.author.id] || 0) + 1;
                    }
                });

                lastId = messages.last().id;
                totalFetched += messages.size;
                if (messages.size < 100) break;
            }

            await updateLeaderboard(interaction.guild);
            return interaction.editReply(`✅ Klaar! Ik heb ${totalFetched} berichten gecheckt. Het leaderboard in #partner-log is bijgewerkt.`);
        }

        if (sub === 'reset') {
            resetPartnerData();
            await updateLeaderboard(interaction.guild);
            return interaction.reply({ content: "🧹 Alle scores zijn gereset naar 0. Je kunt beginnen met een nieuwe uitbetalingsronde!", ephemeral: true });
        }
    },
};

