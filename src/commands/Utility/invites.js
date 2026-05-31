import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Bekijk jouw exclusieve server uitnodiging statistieken!')
        .addUserOption(option => 
            option.setName('gebruiker')
                .setDescription('De gebruiker waarvan je de invites wilt zien (leeg voor jezelf)')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('gebruiker') || interaction.user;
        const { client, guild } = interaction;

        try {
            // Haal de data op uit de bot database
            const dbKey = `invites:${guild.id}:${targetUser.id}`;
            const stats = (await client.db.get(dbKey)) || { joins: 0, leaves: 0 };

            // Bereken de "Fake" of "Netto" score (Joins min Leaves)
            const nettoInvites = Math.max(0, stats.joins - stats.leaves);

            // Prachtige, exclusieve Embed
            const embed = new EmbedBuilder()
                .setColor('#1E1F22') // Super strakke, donkere Discord kleur
                .setAuthor({ 
                    name: `✨ EXCLUSIVE INVITE STATS`, 
                    iconURL: guild.iconURL({ dynamic: true }) 
                })
                .setTitle(`✉️ Overzicht voor ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setDescription(`Hieronder staan de officiële netwerkstatistieken van deze gebruiker binnen **${guild.name}**.`)
                .addFields(
                    { name: '📥 Totaal Gekomen', value: `\`\`\`📥 ${stats.joins} gebruikers\`\`\``, inline: true },
                    { name: '📤 Totaal Verlaten', value: `\`\`\`📤 ${stats.leaves} gebruikers\`\`\``, inline: true },
                    { name: '⭐ Netto Invites', value: `\`\`\`⭐ ${nettoInvites} overgebleven\`\`\``, inline: false }
                )
                .setFooter({ text: `NexSpace Premium Tracking System`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Er ging iets mis bij het ophalen van de stats.', ephemeral: true });
        }
    },
};
