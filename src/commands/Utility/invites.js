import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Bekijk je eigen invite statistieken of die van een ander lid')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('De gebruiker waarvan je de invites wilt zien')
                .setRequired(false)),

    async execute(interaction) {
        const { guild, client, user } = interaction;
        
        // Als er een andere gebruiker is geselecteerd, pakken we die, anders de persoon die het commando typt
        const targetUser = interaction.options.getUser('target') || user;

        try {
            let totalJoins = 0;
            let totalLeaves = 0;

            // Haal de live statistieken op uit de database die de tracker bijhoudt
            if (client.db) {
                const dbKey = `invites:${guild.id}:${targetUser.id}`;
                const stats = await client.db.get(dbKey);
                
                if (stats) {
                    totalJoins = stats.joins || 0;
                    totalLeaves = stats.leaves || 0;
                }
            }

            // Netto invites berekenen (binnengekomen min weggegaan)
            const netInvites = Math.max(0, totalJoins - totalLeaves);

            const embed = new EmbedBuilder()
                .setTitle('✨ EXCLUSIVE INVITE STATS')
                .setDescription(`✉️ **Overzicht voor ${targetUser.username}**\n\nHieronder staan de officiële netwerkstatistieken van deze gebruiker binnen **${guild.name}**.`)
                .setColor('#00fbff')
                .addFields(
                    { name: '📥 Totaal Gekomen', value: `\`\`\`📥 ${totalJoins} gebruikers\`\`\``, inline: false },
                    { name: '📤 Totaal Verlaten', value: `\`\`\`📤 ${totalLeaves} gebruikers\`\`\``, inline: false },
                    { name: '⭐ Netto Invites', value: `\`\`\`⭐ ${netInvites} overgebleven\`\`\``, inline: false }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `NexSpace Premium Tracking System | Today at ${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}` });

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Fout bij het uitvoeren van invites commando:', error);
            return interaction.reply({ content: '❌ Er ging iets mis bij het ophalen van de invite statistieken.', ephemeral: true });
        }
    }
};
