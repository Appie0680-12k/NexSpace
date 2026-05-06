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
            await interaction.reply({ content: '⏳ Bezig met het uitlezen van het kanaal en updaten van de database... Dit kan even duren.', ephemeral: true });
            
            // Dit roept de functie aan die in partnerTracker.js staat
            await fullChannelScan(interaction.guild);
            
            return interaction.editReply('✅ Klaar! Het kanaal is volledig uitgelezen en het leaderboard is bijgewerkt.');
        }
    },
};
