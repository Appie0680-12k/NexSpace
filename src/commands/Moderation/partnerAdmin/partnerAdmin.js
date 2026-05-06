import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { fullChannelScan, resetAllData, updateLeaderboard } from '../../events/partnerTracker.js';

export default {
    data: new SlashCommandBuilder()
        .setName('partneradmin')
        .setDescription('Beheer het partner leaderboard')
        .addSubcommand(subcommand =>
            subcommand.setName('update')
                .setDescription('Scant oude berichten en update het leaderboard'))
        .addSubcommand(subcommand =>
            subcommand.setName('reset')
                .setDescription('Zet alle scores op 0 (Alleen voor Admins)'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'update') {
            await interaction.reply({ content: '⏳ Bezig met scannen van oude berichten...', ephemeral: true });
            await fullChannelScan(interaction.guild);
            return interaction.editReply('✅ Leaderboard succesvol bijgewerkt op basis van kanaal-geschiedenis!');
        }

        if (sub === 'reset') {
            resetAllData();
            await updateLeaderboard(interaction.guild);
            return interaction.reply({ content: '🗑️ Het leaderboard is volledig gereset naar 0.', ephemeral: false });
        }
    },
};
