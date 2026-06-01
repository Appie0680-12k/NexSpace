import {
    SlashCommandBuilder,
    EmbedBuilder
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Bekijk invites')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Bekijk invites van iemand')
                .setRequired(false)
        ),

    async execute(interaction, client) {

        const target =
            interaction.options.getUser('user') ||
            interaction.user;

        const dbKey =
            `invites:${interaction.guild.id}:${target.id}`;

        const stats =
            await client.db.get(dbKey) || {
                joins: 0,
                leaves: 0
            };

        const total =
            stats.joins - stats.leaves;

        const embed =
            new EmbedBuilder()
                .setColor('#00fbff')
                .setTitle('📨 Invite Statistieken')
                .setThumbnail(
                    target.displayAvatarURL()
                )
                .addFields(
                    {
                        name: 'Gebruiker',
                        value: target.tag,
                        inline: true
                    },
                    {
                        name: 'Invites',
                        value: `${total}`,
                        inline: true
                    }
                )
                .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }
};
