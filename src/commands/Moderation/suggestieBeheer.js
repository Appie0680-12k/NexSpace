import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('antwoord')
        .setDescription('Reageer officieel op een suggestie')
        .addStringOption(option => 
            option.setName('message_id')
                .setDescription('Het ID van het suggestie bericht')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reactie')
                .setDescription('Wat is je officiële reactie?')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const messageId = interaction.options.getString('message_id');
        const reactieTekst = interaction.options.getString('reactie');
        const kanaal = interaction.guild.channels.cache.find(c => c.name === 'suggesties');

        try {
            const message = await kanaal.messages.fetch(messageId);
            const oldEmbed = message.embeds[0];

            const newEmbed = EmbedBuilder.from(oldEmbed)
                .addFields({ 
                    name: `Reactie van ${interaction.user.tag}`, 
                    value: `\n*${reactieTekst}*` 
                })
                .setColor('#00FF00'); // Verander kleur naar groen bij reactie

            await message.edit({ embeds: [newEmbed] });
            await interaction.reply({ content: 'Reactie geplaatst!', ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: 'Kon het bericht niet vinden. Heb je het juiste ID?', ephemeral: true });
        }
    },
};
