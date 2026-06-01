import {
    SlashCommandBuilder,
    EmbedBuilder
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Bekijk je invites')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Bekijk invites van iemand anders')
                .setRequired(false)
        ),

    async execute(interaction, client) {

        const target =
            interaction.options.getUser('user') ||
            interaction.user;

        const dbKey = `invites:${interaction.guild.id}:${target.id}`;

        const data =
            (await client.db.get(dbKey)) || {
                joins: 0,
                leaves: 0
            };

        const total = data.joins - data.leaves;

        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle('📨 Invite Stats')
            .setThumbnail(target.displayAvatarURL())
            .addFields(
                {
                    name: 'Gebruiker',
                    value: `${target.tag}`,
                    inline: true
                },
                {
                    name: 'Joins',
                    value: `${data.joins}`,
                    inline: true
                },
                {
                    name: 'Leaves',
                    value: `${data.leaves}`,
                    inline: true
                },
                {
                    name: 'Totaal',
                    value: `${total}`,
                    inline: true
                }
            );

        await interaction.reply({
            embeds: [embed]
        });
    }
};
