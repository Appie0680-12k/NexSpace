import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setup-shop')
        .setDescription('Plaats het MTS Shop aankoop ticket panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Alleen voor admins!

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🛒 MTS SHOP - AANKOPEN DOEN')
            .setDescription('Wil je een van de producten uit onze prijzenlijst aanschaffen?\n\nKlik op de onderstaande knop om een aankoop-ticket te openen. Ons team helpt je daar zo snel mogelijk verder!')
            .setColor('#00fbff')
            .setFooter({ text: 'MTS Shop • Veilig & Snel' });

        const button = new ButtonBuilder()
            .setCustomId('open_purchase_ticket')
            .setLabel('🛒 Aankopen')
            .setStyle(ButtonStyle.Success); // Groene knop

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.reply({ content: '✅ Panel succesvol geplaatst!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    }
};
