import {
    EmbedBuilder,
    ChannelType,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';

export default {
    name: 'interactionCreate',

    async execute(interaction) {

        // =========================
        // REVIEW MODAL
        // =========================

        if (interaction.isModalSubmit()) {

            if (interaction.customId === 'reviewModal') {

                const product =
                    interaction.fields.getTextInputValue('product');

                const prijs =
                    interaction.fields.getTextInputValue('prijs');

                const legit =
                    interaction.fields.getTextInputValue('legit');

                const sterren =
                    interaction.fields.getTextInputValue('sterren');

                const bericht =
                    interaction.fields.getTextInputValue('bericht');

                // REVIEW CHANNEL ID
                const reviewChannel =
                    interaction.guild.channels.cache.get('REVIEW_CHANNEL_ID');

                const embed = new EmbedBuilder()
                    .setTitle('⭐ Nieuwe MTS Shop Review')
                    .setColor('#00fbff')
                    .setThumbnail(
                        interaction.user.displayAvatarURL({
                            dynamic: true
                        })
                    )
                    .addFields(
                        {
                            name: '👤 Klant',
                            value: `${interaction.user}`,
                            inline: true
                        },
                        {
                            name: '📦 Product',
                            value: product,
                            inline: true
                        },
                        {
                            name: '💰 Prijs',
                            value: prijs,
                            inline: true
                        },
                        {
                            name: '✅ Legit',
                            value: legit,
                            inline: true
                        },
                        {
                            name: '⭐ Beoordeling',
                            value: '⭐'.repeat(Number(sterren)),
                            inline: true
                        },
                        {
                            name: '📝 Bericht',
                            value: bericht || 'Geen extra bericht'
                        }
                    )
                    .setTimestamp();

                await reviewChannel.send({
                    embeds: [embed]
                });

                return interaction.reply({
                    content: '✅ Je review is succesvol geplaatst!',
                    ephemeral: true
                });
            }
        }

        // =========================
        // OPEN TICKET
        // =========================

        if (interaction.isButton()) {

            if (interaction.customId === 'open_ticket') {

                // CATEGORIE ID
                const categoryId = 'CATEGORIE_ID';

                // CHECK DUBBEL TICKET
                const existingChannel =
                    interaction.guild.channels.cache.find(
                        c =>
                            c.name ===
                            `ticket-${interaction.user.username.toLowerCase()}`
                    );

                if (existingChannel) {

                    return interaction.reply({
                        content:
                            `❌ Je hebt al een ticket open: ${existingChannel}`,
                        ephemeral: true
                    });
                }

                const channel =
                    await interaction.guild.channels.create({

                        name:
                            `ticket-${interaction.user.username.toLowerCase()}`,

                        type: ChannelType.GuildText,

                        parent: categoryId,

                        permissionOverwrites: [

                            {
                                id: interaction.guild.id,

                                deny: [
                                    PermissionsBitField.Flags.ViewChannel
                                ]
                            },

                            {
                                id: interaction.user.id,

                                allow: [
                                    PermissionsBitField.Flags.ViewChannel,
                                    PermissionsBitField.Flags.SendMessages,
                                    PermissionsBitField.Flags.ReadMessageHistory
                                ]
                            }
                        ]
                    });

                const embed = new EmbedBuilder()
                    .setTitle('🛒 MTS Shop Ticket')
                    .setDescription(
                        `Welkom ${interaction.user}\n\nBeschrijf hieronder wat je wilt kopen.`
                    )
                    .setColor('#00fbff')
                    .setFooter({
                        text: 'MTS Shop Support'
                    });

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('close_ticket')
                            .setLabel('Sluit Ticket')
                            .setEmoji('🔒')
                            .setStyle(ButtonStyle.Danger)
                    );

                await channel.send({
                    content: `${interaction.user}`,
                    embeds: [embed],
                    components: [row]
                });

                return interaction.reply({
                    content:
                        `✅ Je ticket is aangemaakt: ${channel}`,
                    ephemeral: true
                });
            }

            // =========================
            // CLOSE TICKET
            // =========================

            if (interaction.customId === 'close_ticket') {

                await interaction.reply({
                    content:
                        '🗑️ Ticket wordt gesloten over 5 seconden...',
                    ephemeral: true
                });

                setTimeout(async () => {

                    await interaction.channel.delete();

                }, 5000);
            }
        }
    }
};
