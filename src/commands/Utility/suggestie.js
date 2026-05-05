import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('suggestie')
        .setDescription('Stuur een suggestie naar de server')
        .addStringOption(option => 
            option.setName('tekst')
                .setDescription('Wat is je suggestie?')
                .setRequired(true)),

    async execute(interaction) {
        const suggestieTekst = interaction.options.getString('tekst');
        const suggestieKanaal = interaction.guild.channels.cache.find(c => c.name === 'suggesties');

        if (!suggestieKanaal) return interaction.reply({ content: 'Kanaal #suggesties niet gevonden.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setAuthor({ name: 'NexSpace Suggesties', iconURL: interaction.guild.iconURL() })
            .setTitle('Suggestie verzonden door:')
            .setDescription(`${interaction.user} (${interaction.user.tag})\n\n**Suggestie:**\n${suggestieTekst}`)
            .setColor('#5865F2')
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({ text: `${new Date().toLocaleString('nl-NL')}` });

        const message = await suggestieKanaal.send({ embeds: [embed] });
        
        // Voeg de stem-emoji's toe
        await message.react('✅');
        await message.react('❌');

        // Maak automatisch een thread aan (zoals in je screenshot)
        await message.startThread({
            name: `Suggestie van ${interaction.user.username}`,
            autoArchiveDuration: 60,
        });

        await interaction.reply({ content: 'Je suggestie is verzonden!', ephemeral: true });
    },
};
