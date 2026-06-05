import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';

export default {

    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Verstuur het MTS Shop ticket panel'),

    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setTitle('🛒 MTS Shop Aankopen')
            .setDescription(
                'Klik op de knop hieronder om een aankoop ticket te openen.'
            )
            .setColor('#00fbff')
            .setFooter({
                text: 'MTS Shop Support'
            });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ticket')
                    .setLabel('Open Ticket')
                    .setEmoji('🎫')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });

        await interaction.reply({
            content: '✅ Ticket panel verzonden.',
            ephemeral: true
        });
    }
};
