import { EmbedBuilder } from 'discord.js';

export default {
    // Dit moet exact matchen met de setCustomId('update_modal') uit je commando!
    customId: 'update_modal',

    async execute(interaction, guildConfig, client) {
        // 1. Zeg DIRECT tegen Discord dat we de invoer verwerken (stopt het oneindige laden!)
        await interaction.deferReply({ ephemeral: true });

        try {
            // 2. Haal de ingevulde velden op uit de pop-up
            const title = interaction.fields.getTextInputValue('update_title');
            const changes = interaction.fields.getTextInputValue('update_changes');
            const version = interaction.fields.getTextInputValue('update_version') || 'v1.0.0';

            // 3. Zoek het changelog/update kanaal (pas de naam aan naar jouw exacte kanaalnaam!)
            const changelogChannel = interaction.guild.channels.cache.find(c => 
                c.name.includes('changelog') || c.name.includes('updates')
            );

            if (!changelogChannel) {
                return await interaction.editReply({ content: '❌ Kon geen changelog- of updatekanaal vinden in de server.' });
            }

            // 4. Maak een prachtige embed voor de update
            const updateEmbed = new EmbedBuilder()
                .setTitle(`📢 ${title}`)
                .setColor('#00fbff')
                .setDescription(changes)
                .addFields({ name: '📌 Versie / Type', value: `\`${version}\``, inline: true })
                .setFooter({ text: `Doorgegeven door ${interaction.user.username} • NexSpace`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            // 5. Stuur de embed in het juiste kanaal
            await changelogChannel.send({ embeds: [updateEmbed] });

            // 6. Geef een succesmelding aan de admin die het commando gebruikte
            await interaction.editReply({ content: '✅ **De server-update is succesvol geplaatst!**' });

        } catch (error) {
            console.error('Fout bij verwerken update modal:', error);
            await interaction.editReply({ content: '❌ Er ging iets mis bij het plaatsen van de update.' });
        }
    }
};
