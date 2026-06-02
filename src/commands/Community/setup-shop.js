import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setup-shop')
        .setDescription('Plaats het MTS Shop aankoop paneel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🛒 MTS SHOP AANKOPEN')
            .setDescription('Wil je iets kopen uit de prijzenlijst? Klik op de onderstaande knop om een aankoop ticket te openen!\n\n*Misbruik van tickets is strafbaar.*')
            .setColor('#00fbff')
            .setFooter({ text: 'MTS Shop • Altijd veilig en snel' });

        const button = new ButtonBuilder()
            .setCustomId('open_purchase_ticket')
            .setLabel('🛒 Koop Nu')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.editReply({ content: '✅ Het shop-paneel is succesvol geplaatst!' });
    }
};
