import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('remove-blacklist')
        .setDescription('Verwijder een gebruiker van de blacklist.')
        .addUserOption(option => 
            option.setName('gebruiker')
                .setDescription('De persoon die van de blacklist af moet')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('gebruiker');
        const adminChannel = interaction.guild.channels.cache.find(c => c.name === 'administratie');

        const embed = new EmbedBuilder()
            .setTitle('⚪ BLACKLIST VERWIJDERD')
            .setColor('#ffffff')
            .addFields(
                { name: '👤 Gebruiker', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
                { name: '🛡️ Uitgevoerd door', value: `<@${interaction.user.id}>`, inline: true },
                { name: '📝 Status', value: 'Kan vanaf nu weer staffrollen ontvangen.', inline: false }
            )
            .setTimestamp();

        if (adminChannel) {
            await adminChannel.send({ embeds: [embed] });
            return interaction.reply({ content: `✅ <@${targetUser.id}> is van de blacklist gehaald.`, flags: MessageFlags.Ephemeral });
        } else {
            return interaction.reply({ content: '❌ Kanaal `#administratie` niet gevonden.', flags: MessageFlags.Ephemeral });
        }
    }
};
