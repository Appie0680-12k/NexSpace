import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { fullChannelScan } from '../../events/partnerTracker.js';

export default {
    data: new SlashCommandBuilder()
        .setName('partneradmin')
        .setDescription('Beheer het partner leaderboard')
        .addSubcommand(subcommand =>
            subcommand.setName('update')
                .setDescription('Scant de hele geschiedenis en update de database'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'update') {
            await interaction.reply({ content: '⏳ Bezig met scannen... Dit kan even duren.', ephemeral: true });
            
            try {
                await fullChannelScan(interaction.guild);
                return interaction.editReply('✅ Klaar! De geschiedenis is ingeladen en het leaderboard is bijgewerkt.');
            } catch (error) {
                console.error(error);
                return interaction.editReply('❌ Er ging iets mis bij het scannen.');
            }
        }
    },
};
