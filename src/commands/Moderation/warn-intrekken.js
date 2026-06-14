import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('warn-intrekken')
        .setDescription('Trek een waarschuwing van een stafflid in.')
        .addUserOption(option => 
            option.setName('gebruiker')
                .setDescription('Het stafflid waarvan de warn wordt ingetrokken')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reden')
                .setDescription('Reden van intrekken (standaard: Wegens goed gedrag)')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('gebruiker');
        const reden = interaction.options.getString('reden') || 'Ingetrokken wegens goed gedrag.';

        const changelogsChannel = interaction.guild.channels.cache.find(c => c.name === 'changelogs' || c.name.includes('changelog'));

        const embed = new EmbedBuilder()
            .setTitle('🔓 WARN INGETROKKEN')
            .setColor('#00ff66')
            .addFields(
                { name: '👤 Medewerker', value: `<@${targetUser.id}>`, inline: true },
                { name: '🛡️ Uitgeschreven Door', value: `<@${interaction.user.id}>`, inline: true },
                { name: '📝 Status Update', value: `\`${reden}\``, inline: false }
            )
            .setTimestamp();

        if (changelogsChannel) {
            await changelogsChannel.send({ embeds: [embed] });
            return interaction.reply({ content: `✅ De warn voor <@${targetUser.id}> is ingetrokken in <#${changelogsChannel.id}>.`, flags: MessageFlags.Ephemeral });
        } else {
            return interaction.reply({ content: '❌ Kon het `#changelogs` kanaal niet vinden, maar de actie is geregistreerd.', flags: MessageFlags.Ephemeral });
        }
    }
};
